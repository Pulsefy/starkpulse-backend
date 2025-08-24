import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsUpdate } from './entities/news-update.entity';
import { NewsInterest } from './entities/news-interest.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsUpdate, NewsInterest]),
    NotificationsModule,
  ],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
