import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { BranchStatus, PRStatus, MergeStrategy, ReviewStatus, Prisma } from '@prisma/client';

interface CreateBranchDto {
  workflowId: string;
  name: string;
  description?: string;
  baseBranchId?: string; // null for main branch
}

interface CreateCommitDto {
  branchId: string;
  message: string;
  graph: Prisma.InputJsonValue;
  settings?: Prisma.InputJsonValue;
}

interface CreatePullRequestDto {
  workflowId: string;
  title: string;
  description?: string;
  sourceBranchId: string;
  targetBranchId: string;
  reviewRequired?: boolean;
}

interface MergeDto {
  prId: string;
  strategy?: MergeStrategy;
}

interface ReviewDto {
  prId: string;
  status: ReviewStatus;
  body?: string;
}

interface WorkflowGraph {
  nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: unknown }>;
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
  viewport?: { x: number; y: number; zoom: number };
}

interface ConflictInfo {
  nodeId: string;
  type: 'added' | 'removed' | 'modified';
  source: unknown;
  target: unknown;
}

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // BRANCHES
  // ============================================================================

  /**
   * Create the main branch for a workflow (called on workflow creation)
   */
  async createMainBranch(workflowId: string, userId: string, graph: Prisma.InputJsonValue, settings?: Prisma.InputJsonValue) {
    const branch = await this.prisma.workflowBranch.create({
      data: {
        workflowId,
        name: 'main',
        description: 'Main branch',
        createdById: userId,
        graph,
        settings,
        status: 'ACTIVE',
      },
    });

    // Create initial commit
    await this.createCommit({
      branchId: branch.id,
      message: 'Initial commit',
      graph,
      settings,
    }, userId);

    this.logger.log(`Created main branch for workflow ${workflowId}`);
    return branch;
  }

  /**
   * Get all branches for a workflow
   */
  async getBranches(workflowId: string, teamId: string) {
    // Verify workflow access
    const workflow = await this.verifyWorkflowAccess(workflowId, teamId);

    // Check if main branch exists, create it if not (for legacy workflows)
    const mainBranch = await this.prisma.workflowBranch.findUnique({
      where: { workflowId_name: { workflowId, name: 'main' } },
    });

    if (!mainBranch) {
      // Create main branch from current workflow graph
      await this.prisma.workflowBranch.create({
        data: {
          workflowId,
          name: 'main',
          description: 'Main branch',
          createdById: workflow.createdById,
          graph: workflow.graph as Prisma.InputJsonValue,
          settings: workflow.settings as Prisma.InputJsonValue | undefined,
          status: 'ACTIVE',
        },
      });
      this.logger.log(`Created main branch for legacy workflow ${workflowId}`);
    }

    return this.prisma.workflowBranch.findMany({
      where: {
        workflowId,
        status: { not: 'DELETED' },
      },
      orderBy: [
        { name: 'asc' },
      ],
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count: { select: { commits: true, pullRequests: true } },
      },
    });
  }

  /**
   * Create a new branch
   */
  async createBranch(teamId: string, userId: string, dto: CreateBranchDto) {
    await this.verifyWorkflowAccess(dto.workflowId, teamId);

    // Check if branch name is valid
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-_\/]*$/.test(dto.name)) {
      throw new BadRequestException(
        'Branch name can only contain letters, numbers, hyphens, underscores, and slashes',
      );
    }

    // Check if branch already exists
    const existing = await this.prisma.workflowBranch.findUnique({
      where: { workflowId_name: { workflowId: dto.workflowId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException(`Branch '${dto.name}' already exists`);
    }

    // Get base branch (default to main)
    let baseBranch = dto.baseBranchId
      ? await this.prisma.workflowBranch.findUnique({ where: { id: dto.baseBranchId } })
      : await this.prisma.workflowBranch.findUnique({
          where: { workflowId_name: { workflowId: dto.workflowId, name: 'main' } },
        });

    if (!baseBranch) {
      throw new NotFoundException('Base branch not found');
    }

    const branch = await this.prisma.workflowBranch.create({
      data: {
        workflowId: dto.workflowId,
        name: dto.name,
        description: dto.description,
        baseBranchId: baseBranch.id,
        createdById: userId,
        graph: baseBranch.graph as Prisma.InputJsonValue,
        settings: baseBranch.settings as Prisma.InputJsonValue | undefined,
        lastCommitId: baseBranch.lastCommitId,
        status: 'ACTIVE',
      },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        baseBranch: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Created branch ${branch.name} for workflow ${dto.workflowId}`);
    return branch;
  }

  /**
   * Get branch by ID
   */
  async getBranchById(id: string, teamId: string) {
    const branch = await this.prisma.workflowBranch.findUnique({
      where: { id },
      include: {
        workflow: { select: { id: true, name: true, teamId: true } },
        createdBy: { select: { id: true, name: true, avatar: true } },
        baseBranch: { select: { id: true, name: true } },
        commits: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!branch || branch.workflow.teamId !== teamId) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  /**
   * Update branch graph (save changes)
   */
  async updateBranchGraph(
    branchId: string,
    teamId: string,
    userId: string,
    graph: Prisma.InputJsonValue,
    settings?: Prisma.InputJsonValue,
    commitMessage?: string,
  ) {
    const branch = await this.getBranchById(branchId, teamId);

    if (branch.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot update a non-active branch');
    }

    // Update branch
    await this.prisma.workflowBranch.update({
      where: { id: branchId },
      data: { graph, settings },
    });

    // If updating the main branch, also update the main workflow to keep in sync
    if (branch.name === 'main') {
      await this.prisma.workflow.update({
        where: { id: branch.workflowId },
        data: {
          graph,
          settings: settings || undefined,
        },
      });
    }

    // Create commit if message provided
    if (commitMessage) {
      await this.createCommit({ branchId, message: commitMessage, graph, settings }, userId);
    }

    return this.getBranchById(branchId, teamId);
  }

  /**
   * Delete a branch
   */
  async deleteBranch(id: string, teamId: string) {
    const branch = await this.getBranchById(id, teamId);

    if (branch.name === 'main') {
      throw new BadRequestException('Cannot delete the main branch');
    }

    // Check for open PRs
    const openPRs = await this.prisma.workflowPullRequest.count({
      where: {
        sourceBranchId: id,
        status: 'OPEN',
      },
    });

    if (openPRs > 0) {
      throw new BadRequestException('Cannot delete branch with open pull requests');
    }

    await this.prisma.workflowBranch.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Deleted branch ${branch.name}`);
    return { success: true };
  }

  // ============================================================================
  // COMMITS
  // ============================================================================

  /**
   * Create a commit
   */
  async createCommit(dto: CreateCommitDto, userId: string) {
    const branch = await this.prisma.workflowBranch.findUnique({
      where: { id: dto.branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const commit = await this.prisma.branchCommit.create({
      data: {
        branchId: dto.branchId,
        message: dto.message,
        graph: dto.graph,
        settings: dto.settings,
        authorId: userId,
        parentId: branch.lastCommitId,
      },
    });

    // Update branch with latest commit
    await this.prisma.workflowBranch.update({
      where: { id: dto.branchId },
      data: { lastCommitId: commit.id },
    });

    return commit;
  }

  /**
   * Get commit history for a branch
   */
  async getCommitHistory(branchId: string, teamId: string, limit = 50) {
    const branch = await this.getBranchById(branchId, teamId);

    return this.prisma.branchCommit.findMany({
      where: { branchId: branch.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get a specific commit
   */
  async getCommit(commitId: string) {
    const commit = await this.prisma.branchCommit.findUnique({
      where: { id: commitId },
      include: {
        branch: {
          include: {
            workflow: { select: { id: true, teamId: true } },
          },
        },
      },
    });

    if (!commit) {
      throw new NotFoundException('Commit not found');
    }

    return commit;
  }

  // ============================================================================
  // PULL REQUESTS
  // ============================================================================

  /**
   * Create a pull request
   */
  async createPullRequest(teamId: string, userId: string, dto: CreatePullRequestDto) {
    await this.verifyWorkflowAccess(dto.workflowId, teamId);

    // Verify branches exist and belong to the same workflow
    const [sourceBranch, targetBranch] = await Promise.all([
      this.prisma.workflowBranch.findUnique({ where: { id: dto.sourceBranchId } }),
      this.prisma.workflowBranch.findUnique({ where: { id: dto.targetBranchId } }),
    ]);

    if (!sourceBranch || !targetBranch) {
      throw new NotFoundException('Source or target branch not found');
    }

    if (sourceBranch.workflowId !== dto.workflowId || targetBranch.workflowId !== dto.workflowId) {
      throw new BadRequestException('Branches must belong to the same workflow');
    }

    if (sourceBranch.id === targetBranch.id) {
      throw new BadRequestException('Source and target branches must be different');
    }

    // Check for conflicts
    const conflicts = this.detectConflicts(
      sourceBranch.graph as unknown as WorkflowGraph,
      targetBranch.graph as unknown as WorkflowGraph,
    );

    const pr = await this.prisma.workflowPullRequest.create({
      data: {
        workflowId: dto.workflowId,
        title: dto.title,
        description: dto.description,
        sourceBranchId: dto.sourceBranchId,
        targetBranchId: dto.targetBranchId,
        authorId: userId,
        reviewRequired: dto.reviewRequired ?? true,
        conflictData: conflicts.length > 0 ? (conflicts as unknown as Prisma.InputJsonValue) : undefined,
        status: 'OPEN',
      },
      include: {
        sourceBranch: { select: { id: true, name: true } },
        targetBranch: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Created PR ${pr.id}: ${pr.title}`);
    return pr;
  }

  /**
   * Get pull requests for a workflow
   */
  async getPullRequests(workflowId: string, teamId: string, status?: PRStatus) {
    await this.verifyWorkflowAccess(workflowId, teamId);

    return this.prisma.workflowPullRequest.findMany({
      where: {
        workflowId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sourceBranch: { select: { id: true, name: true } },
        targetBranch: { select: { id: true, name: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { comments: true, reviews: true } },
      },
    });
  }

  /**
   * Get PR by ID
   */
  async getPullRequestById(id: string, teamId: string) {
    const pr = await this.prisma.workflowPullRequest.findUnique({
      where: { id },
      include: {
        workflow: { select: { id: true, name: true, teamId: true } },
        sourceBranch: true,
        targetBranch: true,
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            replies: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!pr || pr.workflow.teamId !== teamId) {
      throw new NotFoundException('Pull request not found');
    }

    return pr;
  }

  /**
   * Add a review to a PR
   */
  async addReview(teamId: string, userId: string, dto: ReviewDto) {
    const pr = await this.getPullRequestById(dto.prId, teamId);

    if (pr.status !== 'OPEN') {
      throw new BadRequestException('Can only review open pull requests');
    }

    const review = await this.prisma.pRReview.create({
      data: {
        prId: dto.prId,
        reviewerId: userId,
        status: dto.status,
        body: dto.body,
      },
    });

    this.logger.log(`Added review ${review.id} to PR ${dto.prId}`);
    return review;
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest(teamId: string, userId: string, dto: MergeDto) {
    const pr = await this.getPullRequestById(dto.prId, teamId);

    if (pr.status !== 'OPEN') {
      throw new BadRequestException('Can only merge open pull requests');
    }

    // Check if review is required and approved
    if (pr.reviewRequired) {
      const approvedReview = await this.prisma.pRReview.findFirst({
        where: {
          prId: dto.prId,
          status: 'APPROVED',
        },
      });

      if (!approvedReview) {
        throw new BadRequestException('Pull request requires approval before merging');
      }
    }

    // Check for conflicts
    const conflicts = pr.conflictData as ConflictInfo[] | null;
    if (conflicts && conflicts.length > 0) {
      throw new BadRequestException('Please resolve conflicts before merging');
    }

    // Perform merge
    const strategy = dto.strategy || 'MERGE';
    const mergedGraph = this.performMerge(
      pr.sourceBranch.graph as unknown as WorkflowGraph,
      pr.targetBranch.graph as unknown as WorkflowGraph,
      strategy,
    );

    // Update target branch
    await this.prisma.workflowBranch.update({
      where: { id: pr.targetBranchId },
      data: {
        graph: mergedGraph as unknown as Prisma.InputJsonValue,
      },
    });

    // Create merge commit
    await this.createCommit({
      branchId: pr.targetBranchId,
      message: `Merge branch '${pr.sourceBranch.name}' into '${pr.targetBranch.name}'`,
      graph: mergedGraph as unknown as Prisma.InputJsonValue,
    }, userId);

    // If merging to main, also update the workflow
    if (pr.targetBranch.name === 'main') {
      await this.prisma.workflow.update({
        where: { id: pr.workflowId },
        data: {
          graph: mergedGraph as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
    }

    // Update source branch status
    await this.prisma.workflowBranch.update({
      where: { id: pr.sourceBranchId },
      data: {
        status: 'MERGED',
        mergedAt: new Date(),
      },
    });

    // Update PR status
    await this.prisma.workflowPullRequest.update({
      where: { id: dto.prId },
      data: {
        status: 'MERGED',
        mergedAt: new Date(),
        mergedById: userId,
      },
    });

    this.logger.log(`Merged PR ${dto.prId}`);
    return { success: true, prId: dto.prId };
  }

  /**
   * Close a pull request without merging
   */
  async closePullRequest(id: string, teamId: string) {
    const pr = await this.getPullRequestById(id, teamId);

    if (pr.status !== 'OPEN') {
      throw new BadRequestException('Pull request is not open');
    }

    await this.prisma.workflowPullRequest.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Add comment to PR
   */
  async addComment(
    prId: string,
    teamId: string,
    userId: string,
    body: string,
    nodeId?: string,
    parentId?: string,
  ) {
    await this.getPullRequestById(prId, teamId);

    return this.prisma.pRComment.create({
      data: {
        prId,
        authorId: userId,
        body,
        nodeId,
        parentId,
      },
    });
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string, teamId: string) {
    const comment = await this.prisma.pRComment.findUnique({
      where: { id: commentId },
      include: {
        pullRequest: {
          include: {
            workflow: { select: { teamId: true } },
          },
        },
      },
    });

    if (!comment || comment.pullRequest.workflow.teamId !== teamId) {
      throw new NotFoundException('Comment not found');
    }

    await this.prisma.pRComment.update({
      where: { id: commentId },
      data: { resolved: true },
    });

    return { success: true };
  }

  // ============================================================================
  // DIFF & MERGE HELPERS
  // ============================================================================

  /**
   * Get diff between two branches
   */
  async getDiff(sourceBranchId: string, targetBranchId: string, teamId: string) {
    const [source, target] = await Promise.all([
      this.getBranchById(sourceBranchId, teamId),
      this.getBranchById(targetBranchId, teamId),
    ]);

    const sourceGraph = source.graph as unknown as WorkflowGraph;
    const targetGraph = target.graph as unknown as WorkflowGraph;

    return {
      added: this.getAddedNodes(sourceGraph, targetGraph),
      removed: this.getRemovedNodes(sourceGraph, targetGraph),
      modified: this.getModifiedNodes(sourceGraph, targetGraph),
      edgesChanged: this.getEdgeChanges(sourceGraph, targetGraph),
    };
  }

  private detectConflicts(source: WorkflowGraph, target: WorkflowGraph): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    // Check for nodes modified in both branches
    const sourceNodes = new Map(source.nodes.map((n) => [n.id, n]));
    const targetNodes = new Map(target.nodes.map((n) => [n.id, n]));

    for (const [id, sourceNode] of sourceNodes) {
      const targetNode = targetNodes.get(id);
      if (targetNode) {
        // Both have this node - check if modified differently
        const sourceStr = JSON.stringify(sourceNode);
        const targetStr = JSON.stringify(targetNode);
        if (sourceStr !== targetStr) {
          conflicts.push({
            nodeId: id,
            type: 'modified',
            source: sourceNode,
            target: targetNode,
          });
        }
      }
    }

    return conflicts;
  }

  private performMerge(
    source: WorkflowGraph,
    target: WorkflowGraph,
    strategy: MergeStrategy,
  ): WorkflowGraph {
    if (strategy === 'REBASE') {
      // Take source completely
      return source;
    }

    // MERGE or SQUASH - combine nodes and edges
    const mergedNodes = new Map<string, WorkflowGraph['nodes'][0]>();
    const mergedEdges = new Map<string, WorkflowGraph['edges'][0]>();

    // Add all target nodes first
    for (const node of target.nodes) {
      mergedNodes.set(node.id, node);
    }

    // Add/override with source nodes
    for (const node of source.nodes) {
      mergedNodes.set(node.id, node);
    }

    // Add all target edges first
    for (const edge of target.edges) {
      mergedEdges.set(edge.id, edge);
    }

    // Add/override with source edges
    for (const edge of source.edges) {
      mergedEdges.set(edge.id, edge);
    }

    return {
      nodes: Array.from(mergedNodes.values()),
      edges: Array.from(mergedEdges.values()),
      viewport: source.viewport || target.viewport,
    };
  }

  private getAddedNodes(source: WorkflowGraph, target: WorkflowGraph) {
    const targetIds = new Set(target.nodes.map((n) => n.id));
    return source.nodes.filter((n) => !targetIds.has(n.id));
  }

  private getRemovedNodes(source: WorkflowGraph, target: WorkflowGraph) {
    const sourceIds = new Set(source.nodes.map((n) => n.id));
    return target.nodes.filter((n) => !sourceIds.has(n.id));
  }

  private getModifiedNodes(source: WorkflowGraph, target: WorkflowGraph) {
    const targetNodes = new Map(target.nodes.map((n) => [n.id, n]));
    const modified: Array<{ id: string; source: unknown; target: unknown }> = [];

    for (const sourceNode of source.nodes) {
      const targetNode = targetNodes.get(sourceNode.id);
      if (targetNode && JSON.stringify(sourceNode) !== JSON.stringify(targetNode)) {
        modified.push({
          id: sourceNode.id,
          source: sourceNode,
          target: targetNode,
        });
      }
    }

    return modified;
  }

  private getEdgeChanges(source: WorkflowGraph, target: WorkflowGraph) {
    const sourceEdges = new Set(source.edges.map((e) => JSON.stringify(e)));
    const targetEdges = new Set(target.edges.map((e) => JSON.stringify(e)));

    const added = source.edges.filter((e) => !targetEdges.has(JSON.stringify(e)));
    const removed = target.edges.filter((e) => !sourceEdges.has(JSON.stringify(e)));

    return { added, removed };
  }

  private async verifyWorkflowAccess(workflowId: string, teamId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, teamId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }
}
