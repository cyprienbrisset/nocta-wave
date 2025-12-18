import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { TeamModule } from '../team/team.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [TeamModule, DatabaseModule],
  controllers: [CommentController, TagController, TemplateController],
  providers: [CommentService, TagService, TemplateService],
  exports: [CommentService, TagService, TemplateService],
})
export class CollaborationModule {}
