import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface SearchResult {
  type: 'workflow' | 'template' | 'node';
  id: string;
  title: string;
  description?: string;
  teamId?: string;
  teamName?: string;
  updatedAt?: Date;
  matchedIn?: string; // Where the match was found
}

export interface SearchQuery {
  query: string;
  types?: ('workflow' | 'template' | 'node')[];
  teamId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Search across workflows, templates, and nodes
   */
  async search(
    userId: string,
    teamIds: string[],
    searchQuery: SearchQuery,
  ): Promise<{ results: SearchResult[]; total: number }> {
    const { query, types = ['workflow', 'template', 'node'], limit = 20, offset = 0 } = searchQuery;

    if (!query || query.length < 2) {
      return { results: [], total: 0 };
    }

    const results: SearchResult[] = [];
    let total = 0;

    // Search workflows
    if (types.includes('workflow')) {
      const workflowResults = await this.searchWorkflows(query, teamIds, limit);
      results.push(...workflowResults.results);
      total += workflowResults.total;
    }

    // Search templates
    if (types.includes('template')) {
      const templateResults = await this.searchTemplates(query, teamIds, limit);
      results.push(...templateResults.results);
      total += templateResults.total;
    }

    // Search nodes within workflows
    if (types.includes('node')) {
      const nodeResults = await this.searchNodes(query, teamIds, limit);
      results.push(...nodeResults.results);
      total += nodeResults.total;
    }

    // Sort by relevance (simple: exact matches first, then partial)
    const sortedResults = this.sortByRelevance(results, query);

    // Apply pagination
    const paginatedResults = sortedResults.slice(offset, offset + limit);

    return { results: paginatedResults, total };
  }

  /**
   * Search workflows by name and description
   */
  private async searchWorkflows(
    query: string,
    teamIds: string[],
    limit: number,
  ): Promise<{ results: SearchResult[]; total: number }> {
    const where: Prisma.WorkflowWhereInput = {
      teamId: { in: teamIds },
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [workflows, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          team: { select: { id: true, name: true } },
        },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return {
      results: workflows.map((w) => ({
        type: 'workflow' as const,
        id: w.id,
        title: w.name,
        description: w.description || undefined,
        teamId: w.teamId,
        teamName: w.team.name,
        updatedAt: w.updatedAt,
        matchedIn: w.name.toLowerCase().includes(query.toLowerCase()) ? 'name' : 'description',
      })),
      total,
    };
  }

  /**
   * Search templates by name, description, and tags
   */
  private async searchTemplates(
    query: string,
    teamIds: string[],
    limit: number,
  ): Promise<{ results: SearchResult[]; total: number }> {
    const where: Prisma.WorkflowTemplateWhereInput = {
      OR: [
        { isPublic: true },
        { teamId: { in: teamIds } },
      ],
      AND: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query.toLowerCase()] } },
        ],
      },
    };

    const [templates, total] = await Promise.all([
      this.prisma.workflowTemplate.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          team: { select: { id: true, name: true } },
        },
      }),
      this.prisma.workflowTemplate.count({ where }),
    ]);

    return {
      results: templates.map((t) => ({
        type: 'template' as const,
        id: t.id,
        title: t.name,
        description: t.description || undefined,
        teamId: t.teamId || undefined,
        teamName: t.team?.name,
        updatedAt: t.updatedAt,
        matchedIn: t.name.toLowerCase().includes(query.toLowerCase())
          ? 'name'
          : t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
            ? 'tags'
            : 'description',
      })),
      total,
    };
  }

  /**
   * Search nodes within workflows
   */
  private async searchNodes(
    query: string,
    teamIds: string[],
    limit: number,
  ): Promise<{ results: SearchResult[]; total: number }> {
    // Search in workflow graphs using JSON path queries
    // This searches for node labels that contain the query
    const workflows = await this.prisma.workflow.findMany({
      where: {
        teamId: { in: teamIds },
      },
      select: {
        id: true,
        name: true,
        teamId: true,
        graph: true,
        team: { select: { name: true } },
      },
    });

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const workflow of workflows) {
      const graph = workflow.graph as { nodes?: Array<{ id: string; data?: { label?: string; nodeType?: string } }> };
      if (!graph.nodes) continue;

      for (const node of graph.nodes) {
        const label = node.data?.label || '';
        const nodeType = node.data?.nodeType || '';

        if (label.toLowerCase().includes(queryLower) || nodeType.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'node',
            id: `${workflow.id}#${node.id}`,
            title: label || nodeType,
            description: `Node in "${workflow.name}"`,
            teamId: workflow.teamId,
            teamName: workflow.team.name,
            matchedIn: label.toLowerCase().includes(queryLower) ? 'label' : 'type',
          });

          if (results.length >= limit) break;
        }
      }

      if (results.length >= limit) break;
    }

    return { results, total: results.length };
  }

  /**
   * Sort results by relevance
   */
  private sortByRelevance(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase();

    return results.sort((a, b) => {
      // Exact match in title first
      const aExact = a.title.toLowerCase() === queryLower;
      const bExact = b.title.toLowerCase() === queryLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Starts with query
      const aStarts = a.title.toLowerCase().startsWith(queryLower);
      const bStarts = b.title.toLowerCase().startsWith(queryLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Type priority: workflow > template > node
      const typePriority = { workflow: 0, template: 1, node: 2 };
      return typePriority[a.type] - typePriority[b.type];
    });
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSuggestions(
    userId: string,
    teamIds: string[],
    prefix: string,
    limit: number = 5,
  ): Promise<string[]> {
    if (!prefix || prefix.length < 2) {
      return [];
    }

    const suggestions = new Set<string>();

    // Workflow names
    const workflows = await this.prisma.workflow.findMany({
      where: {
        teamId: { in: teamIds },
        name: { startsWith: prefix, mode: 'insensitive' },
      },
      select: { name: true },
      take: limit,
    });
    workflows.forEach((w) => suggestions.add(w.name));

    // Template names and tags
    const templates = await this.prisma.workflowTemplate.findMany({
      where: {
        OR: [{ isPublic: true }, { teamId: { in: teamIds } }],
        name: { startsWith: prefix, mode: 'insensitive' },
      },
      select: { name: true, tags: true },
      take: limit,
    });
    templates.forEach((t) => {
      suggestions.add(t.name);
      t.tags.forEach((tag) => {
        if (tag.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.add(tag);
        }
      });
    });

    return Array.from(suggestions).slice(0, limit);
  }
}
