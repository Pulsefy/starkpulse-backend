import { Controller, Post, Body } from '@nestjs/common';
import { NewsService } from './news.service';

class PublishNewsDto {
  title: string;
  content: string;
  category: string;
}

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post('publish')
  async publishNews(@Body() publishNewsDto: PublishNewsDto) {
    const { title, content, category } = publishNewsDto;

    // Publish the news and trigger notifications
    const news = await this.newsService.publishNewsUpdate(title, content, category);

    return { message: 'News published and notifications sent', news };
  }
}
