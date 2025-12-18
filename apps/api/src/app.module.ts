import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Database
import { DatabaseModule } from './database/database.module';

// Worker
import { WorkerModule } from './worker/worker.module';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TeamModule } from './modules/team/team.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { CredentialModule } from './modules/credential/credential.module';
import { NodeModule } from './modules/node/node.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { HealthModule } from './modules/health/health.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';

@Module({
  imports: [
    // Configuration - load from monorepo root
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.local', '../../.env', '.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Database
    DatabaseModule,

    // Worker (processes workflow executions)
    WorkerModule,

    // Feature modules
    AuthModule,
    UserModule,
    TeamModule,
    WorkflowModule,
    ExecutionModule,
    CredentialModule,
    NodeModule,
    WebhookModule,
    HealthModule,
    CollaborationModule,
  ],
})
export class AppModule {}
