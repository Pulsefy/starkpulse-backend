import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { NewsService } from './news.service';
// import { CreateNewsArticleDto } from './dto/create-news-article.dto';
// import { UpdateNewsArticleDto } from './dto/update-news-article.dto';
// import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new news article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully created.' })
  create(@Body() createNewsArticleDto: CreateNewsArticleDto) {
    return this.newsService.create(createNewsArticleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all news articles' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.newsService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific news article' })
  findOne(@Param('id') id: string) {
    return this.newsService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a news article' })
  update(@Param('id') id: string, @Body() updateNewsArticleDto: UpdateNewsArticleDto) {
    return this.newsService.update(+id, updateNewsArticleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a news article' })
  remove(@Param('id') id: string) {
    return this.newsService.remove(+id);
  }
}