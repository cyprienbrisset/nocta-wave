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
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto, CommentQueryDto } from './dto/comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCommentDto) {
    return this.commentService.create(userId, dto);
  }

  @Get('workflow/:workflowId')
  findByWorkflow(
    @CurrentUser('id') userId: string,
    @Param('workflowId') workflowId: string,
    @Query() query: CommentQueryDto,
  ) {
    return this.commentService.findByWorkflow(workflowId, userId, query);
  }

  @Get(':id')
  findById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.commentService.findById(id, userId);
  }

  @Put(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(id, userId, dto);
  }

  @Put(':id/resolve')
  resolve(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.commentService.resolve(id, userId);
  }

  @Put(':id/unresolve')
  unresolve(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.commentService.unresolve(id, userId);
  }

  @Delete(':id')
  delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.commentService.delete(id, userId);
  }
}
