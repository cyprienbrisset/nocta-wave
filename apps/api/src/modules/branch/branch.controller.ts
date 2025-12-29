import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { PRStatus, MergeStrategy, ReviewStatus, Prisma } from '@prisma/client';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchController {
  constructor(private branchService: BranchService) {}

  // ============================================================================
  // BRANCHES
  // ============================================================================

  /**
   * Get all branches for a workflow
   */
  @Get('workflow/:workflowId')
  async getBranches(@Param('workflowId') workflowId: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getBranches(workflowId, teamId);
  }

  /**
   * Create a new branch
   */
  @Post()
  async createBranch(
    @Body()
    dto: {
      workflowId: string;
      name: string;
      description?: string;
      baseBranchId?: string;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.branchService.createBranch(teamId, userId, dto);
  }

  /**
   * Get branch by ID
   */
  @Get(':id')
  async getBranchById(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getBranchById(id, teamId);
  }

  /**
   * Update branch graph (save changes)
   */
  @Put(':id/graph')
  async updateBranchGraph(
    @Param('id') id: string,
    @Body()
    dto: {
      graph: Record<string, unknown>;
      settings?: Record<string, unknown>;
      commitMessage?: string;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.branchService.updateBranchGraph(
      id,
      teamId,
      userId,
      dto.graph as Prisma.InputJsonValue,
      dto.settings as Prisma.InputJsonValue | undefined,
      dto.commitMessage,
    );
  }

  /**
   * Delete a branch
   */
  @Delete(':id')
  async deleteBranch(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.deleteBranch(id, teamId);
  }

  // ============================================================================
  // COMMITS
  // ============================================================================

  /**
   * Get commit history for a branch
   */
  @Get(':id/commits')
  async getCommitHistory(
    @Param('id') id: string,
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getCommitHistory(
      id,
      teamId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /**
   * Create a commit
   */
  @Post(':id/commits')
  async createCommit(
    @Param('id') branchId: string,
    @Body()
    dto: {
      message: string;
      graph: Record<string, unknown>;
      settings?: Record<string, unknown>;
    },
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.branchService.createCommit(
      {
        branchId,
        message: dto.message,
        graph: dto.graph as Prisma.InputJsonValue,
        settings: dto.settings as Prisma.InputJsonValue | undefined,
      },
      userId,
    );
  }

  /**
   * Get a specific commit
   */
  @Get('commits/:commitId')
  async getCommit(@Param('commitId') commitId: string) {
    return this.branchService.getCommit(commitId);
  }

  // ============================================================================
  // PULL REQUESTS
  // ============================================================================

  /**
   * Get pull requests for a workflow
   */
  @Get('workflow/:workflowId/pull-requests')
  async getPullRequests(
    @Param('workflowId') workflowId: string,
    @Req() req: any,
    @Query('status') status?: PRStatus,
  ) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getPullRequests(workflowId, teamId, status);
  }

  /**
   * Create a pull request
   */
  @Post('pull-requests')
  async createPullRequest(
    @Body()
    dto: {
      workflowId: string;
      title: string;
      description?: string;
      sourceBranchId: string;
      targetBranchId: string;
      reviewRequired?: boolean;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.branchService.createPullRequest(teamId, userId, dto);
  }

  /**
   * Get PR by ID
   */
  @Get('pull-requests/:id')
  async getPullRequestById(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getPullRequestById(id, teamId);
  }

  /**
   * Add a review to a PR
   */
  @Post('pull-requests/:id/reviews')
  async addReview(
    @Param('id') prId: string,
    @Body() dto: { status: ReviewStatus; body?: string },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.branchService.addReview(teamId, userId, {
      prId,
      status: dto.status,
      body: dto.body,
    });
  }

  /**
   * Merge a pull request
   */
  @Post('pull-requests/:id/merge')
  async mergePullRequest(
    @Param('id') prId: string,
    @Body() dto: { strategy?: MergeStrategy },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.branchService.mergePullRequest(teamId, userId, {
      prId,
      strategy: dto.strategy,
    });
  }

  /**
   * Close a pull request
   */
  @Post('pull-requests/:id/close')
  async closePullRequest(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.closePullRequest(id, teamId);
  }

  /**
   * Add comment to PR
   */
  @Post('pull-requests/:id/comments')
  async addComment(
    @Param('id') prId: string,
    @Body() dto: { body: string; nodeId?: string; parentId?: string },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.branchService.addComment(
      prId,
      teamId,
      userId,
      dto.body,
      dto.nodeId,
      dto.parentId,
    );
  }

  /**
   * Resolve a comment
   */
  @Post('comments/:id/resolve')
  async resolveComment(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.resolveComment(id, teamId);
  }

  /**
   * Get diff between two branches
   */
  @Get('diff')
  async getDiff(
    @Query('source') sourceBranchId: string,
    @Query('target') targetBranchId: string,
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getDiff(sourceBranchId, targetBranchId, teamId);
  }

  // ============================================================================
  // VERSION TAGS
  // ============================================================================

  /**
   * Get all version tags for a workflow
   */
  @Get('workflow/:workflowId/tags')
  async getVersionTags(@Param('workflowId') workflowId: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getVersionTags(workflowId, teamId);
  }

  /**
   * Get releases only for a workflow
   */
  @Get('workflow/:workflowId/releases')
  async getReleases(@Param('workflowId') workflowId: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getReleases(workflowId, teamId);
  }

  /**
   * Create a version tag
   */
  @Post('tags')
  async createVersionTag(
    @Body()
    dto: {
      workflowId: string;
      commitId: string;
      name: string;
      description?: string;
      isRelease?: boolean;
      metadata?: Record<string, unknown>;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.branchService.createVersionTag(teamId, userId, dto);
  }

  /**
   * Get a specific version tag
   */
  @Get('tags/:id')
  async getVersionTag(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getVersionTag(id, teamId);
  }

  /**
   * Delete a version tag
   */
  @Delete('tags/:id')
  async deleteVersionTag(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.deleteVersionTag(id, teamId);
  }

  // ============================================================================
  // ROLLBACK
  // ============================================================================

  /**
   * Rollback a branch to a specific commit
   */
  @Post(':id/rollback')
  async rollbackToCommit(
    @Param('id') branchId: string,
    @Body() dto: { commitId: string; createBackupTag?: boolean },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.branchService.rollbackToCommit(branchId, dto.commitId, teamId, userId, {
      createBackupTag: dto.createBackupTag,
    });
  }

  /**
   * Rollback to a specific version tag
   */
  @Post('tags/:id/rollback')
  async rollbackToTag(
    @Param('id') tagId: string,
    @Body() dto: { createBackupTag?: boolean; targetBranchId?: string },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.branchService.rollbackToTag(tagId, teamId, userId, dto);
  }

  /**
   * Get rollback history for a branch
   */
  @Get(':id/rollback-history')
  async getRollbackHistory(@Param('id') branchId: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getRollbackHistory(branchId, teamId);
  }

  // ============================================================================
  // ENHANCED DIFF
  // ============================================================================

  /**
   * Get detailed diff between two commits
   */
  @Get('commits/diff')
  async getCommitDiff(
    @Query('source') sourceCommitId: string,
    @Query('target') targetCommitId: string,
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getCommitDiff(sourceCommitId, targetCommitId, teamId);
  }

  /**
   * Get diff between current branch state and a specific commit
   */
  @Get(':id/diff/:commitId')
  async getBranchCommitDiff(
    @Param('id') branchId: string,
    @Param('commitId') commitId: string,
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.branchService.getBranchCommitDiff(branchId, commitId, teamId);
  }
}
