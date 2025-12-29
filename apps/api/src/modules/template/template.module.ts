import { Module, forwardRef } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { TemplateRatingService } from './template-rating.service';
import { TemplateShareService } from './template-share.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => NotificationModule)],
  controllers: [TemplateController],
  providers: [TemplateService, TemplateRatingService, TemplateShareService],
  exports: [TemplateService, TemplateRatingService, TemplateShareService],
})
export class TemplateModule {}
