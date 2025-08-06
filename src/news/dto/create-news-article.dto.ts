export class CreateNewsArticleDto {
  title: string;
  content: string;
  summary?: string;
  source: string;
  author?: string;
  publishedAt: Date;
  url: string;
  imageUrl?: string;
}