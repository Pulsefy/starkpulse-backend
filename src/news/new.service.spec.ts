import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsArticle } from './entities/news_articles.entities';

describe('NewsService', () => {
  let service: NewsService;
  let newsRepository: Repository<NewsArticle>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: getRepositoryToken(NewsArticle),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    newsRepository = module.get<Repository<NewsArticle>>(
      getRepositoryToken(NewsArticle),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more test cases here
});