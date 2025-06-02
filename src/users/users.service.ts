import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async findByWalletAddress(
    walletAddress: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({ where: { walletAddress } });
  }

  public async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  public async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }
}
