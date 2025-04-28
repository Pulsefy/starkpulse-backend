import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { NewsController } from './news.controller';
import { NewsService } from './news.service';
// import { NewsArticle } from './entities/news-article.entity';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { Author } from './entities/author.entity';
import { NewsArticle } from './entities/news_articles.entities';
import { NewsController } from './news.controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsArticle, Category, Tag, Author]),
  ],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}