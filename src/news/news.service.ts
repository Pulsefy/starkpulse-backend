import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { NewsArticle } from './entities/news_articles.entities';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { Author } from './entities/author.entity';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsArticle)
    private readonly newsRepository: Repository<NewsArticle>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,

    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
  ) {}

  async create(createNewsArticleDto: CreateNewsArticleDto) {
    const article = new NewsArticle();
    Object.assign(article, createNewsArticleDto);

    if (createNewsArticleDto.authorId) {
      const author = await this.authorRepository.findOneBy({
        id: createNewsArticleDto.authorId,
      });
      if (author) {
        article.author = author;
      }
    }

    if (createNewsArticleDto.categoryIds?.length) {
      const categories = await this.categoryRepository.findBy({
        id: In(createNewsArticleDto.categoryIds),
      });
      article.categories = categories;
    }

    if (createNewsArticleDto.tagIds?.length) {
      const tags = await this.tagRepository.findBy({
        id: In(createNewsArticleDto.tagIds),
      });
      article.tags = tags;
    }

    return this.newsRepository.save(article);
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search, category, tag, author } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.title = Like(`%${search}%`);
    }

    if (author) {
      where.author = { id: author };
    }

    const [articles, total] = await this.newsRepository.findAndCount({
      where,
      relations: ['author', 'categories', 'tags'],
      skip,
      take: limit,
      // order: { publishedAt: 'DESC' },
    });

    // Filter by category and tag manually (due to limitations in nested relations filtering)
    const filteredArticles = articles.filter((article) => {
      const categoryMatch = category
        ? article.categories?.some((cat) => cat.id === +category)
        : true;

      const tagMatch = tag
        ? article.tags?.some((t) => t.id === +tag)
        : true;

      return categoryMatch && tagMatch;
    });

    return {
      data: filteredArticles,
      meta: {
        total: filteredArticles.length,
        page,
        limit,
        totalPages: Math.ceil(filteredArticles.length / limit),
      },
    };
  }

  async findOne(id: number) {
    return this.newsRepository.findOne({
      where: { id },
      relations: ['author', 'categories', 'tags'],
    });
  }

  async update(id: number, updateNewsArticleDto: UpdateNewsArticleDto) {
    const article = await this.newsRepository.findOne({
      where: { id },
      relations: ['categories', 'tags', 'author'],
    });
    if (!article) {
      return null;
    }

    Object.assign(article, updateNewsArticleDto);

    if (updateNewsArticleDto.authorId) {
      const author = await this.authorRepository.findOneBy({
        id: updateNewsArticleDto.authorId,
      });
      if (author) {
        article.author = author;
      }
    }

    if (updateNewsArticleDto.categoryIds?.length) {
      article.categories = await this.categoryRepository.findBy({
        id: In(updateNewsArticleDto.categoryIds),
      });
    }

    if (updateNewsArticleDto.tagIds?.length) {
      article.tags = await this.tagRepository.findBy({
        id: In(updateNewsArticleDto.tagIds),
      });
    }

    return this.newsRepository.save(article);
  }

  async remove(id: number) {
    return this.newsRepository.delete(id);
  }
}
