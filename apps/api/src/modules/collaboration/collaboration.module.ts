import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Existing services
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

// Real-time collaboration services
import { RealtimeGateway } from './realtime/realtime.gateway';
import { RealtimeService } from './realtime/realtime.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChangeService } from './change.service';
import { ChangeController } from './change.controller';
import { CollaborationLinkService } from './collaboration-link.service';
import { CollaborationLinkController } from './collaboration-link.controller';

// Dependencies
import { TeamModule } from '../team/team.module';
import { DatabaseModule } from '../../database/database.module';
import { ExecutionModule } from '../execution/execution.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TeamModule,
    DatabaseModule,
    forwardRef(() => ExecutionModule),
    forwardRef(() => NotificationModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [
    CommentController,
    TagController,
    TemplateController,
    ChatController,
    ChangeController,
    CollaborationLinkController,
  ],
  providers: [
    // Existing
    CommentService,
    TagService,
    TemplateService,
    // Real-time
    RealtimeGateway,
    RealtimeService,
    ChatService,
    ChangeService,
    CollaborationLinkService,
  ],
  exports: [
    CommentService,
    TagService,
    TemplateService,
    RealtimeService,
    ChatService,
    ChangeService,
    CollaborationLinkService,
  ],
})
export class CollaborationModule {}
