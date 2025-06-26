import { Controller, Post, Body } from '@nestjs/common';
import { NewsService } from './news.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

class PublishNewsDto {
  title: string;
  content: string;
  category: string;
}

@ApiTags('News')
@ApiBearerAuth()
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post('publish')
  @ApiOperation({
    summary: 'Publish a news update',
    description: 'Publishes a news update and triggers notifications to users.',
  })
  @ApiBody({
    type: PublishNewsDto,
    schema: {
      example: {
        title: 'StarkNet v0.12 Released',
        content: 'Major upgrade to StarkNet protocol...',
        category: 'blockchain',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'News published and notifications sent',
    example: {
      message: 'News published and notifications sent',
      news: {
        id: 1,
        title: 'StarkNet v0.12 Released',
        content: 'Major upgrade to StarkNet protocol...',
        category: 'blockchain',
        publishedAt: '2025-06-03T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async publishNews(@Body() publishNewsDto: PublishNewsDto) {
    const { title, content, category } = publishNewsDto;

    // Publish the news and trigger notifications
    const news = await this.newsService.publishNewsUpdate(
      title,
      content,
      category,
    );

    return { message: 'News published and notifications sent', news };
  }
}
