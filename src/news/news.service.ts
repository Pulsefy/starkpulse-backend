import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NewsUpdate } from "./entities/news-update.entity";
import { NewsInterest } from "./entities/news-interest.entity";
import { NotificationsService } from "src/notifications/notifications.service";

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsUpdate)
    private readonly newsRepo: Repository<NewsUpdate>,

    @InjectRepository(NewsInterest)
    private readonly interestRepo: Repository<NewsInterest>,
    
    private readonly notificationsService: NotificationsService,
  ) {}

  async publishNewsUpdate(
    title: string,
    content: string,
    category: string,
  ): Promise<NewsUpdate> {
    const news = this.newsRepo.create({ title, content, category });
    await this.newsRepo.save(news);

    // Get all users interested in this category
    const interestedUsers = await this.interestRepo.find({ where: { category } });

    // Send a notification to each user
    for (const user of interestedUsers) {
      await this.notificationsService.send({
        userId: user.userId,
        title: `News: ${title}`,
        content: content,
        channel: 'in_app',
        metadata: { category },
      });
    }

    return news;
  }
}
