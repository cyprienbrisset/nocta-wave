import { Module, forwardRef } from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => NotificationModule)],
  providers: [SuggestionService],
  exports: [SuggestionService],
})
export class SuggestionModule {}
