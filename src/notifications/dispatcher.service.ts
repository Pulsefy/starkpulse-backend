import { User } from "src/users/users.entity";
import { Repository } from "typeorm";
import { Notification } from "./entities/notification.entity";
import { Injectable } from "@nestjs/common";
import { Queue } from 'bull';

@Injectable()
export class DispatcherService {
  constructor(
    private readonly queue: Queue,
    private readonly userRepo: Repository<User>,
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async dispatch(userId: string, message: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
  
    const preferences = [
      user.allowInApp && 'IN_APP',
      user.allowEmail && 'EMAIL',
      user.allowPush && 'PUSH',
    ].filter(Boolean) as ('IN_APP' | 'EMAIL' | 'PUSH')[];
  
    for (const type of preferences) {
      const notification = this.notificationRepo.create({
        user : { id: user.id },
        content: message,
        type,
      });
      await this.notificationRepo.save(notification);
      await this.queue.add(notification, { priority: type === 'PUSH' ? 1 : 2 });
    }
  }  
}