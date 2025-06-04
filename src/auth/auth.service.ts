import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SessionService } from '../session/session.service';
import { User } from './entities/user.entity';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Injectable()
export class AuthService {
  verifyJwt: any;
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private sessionService: SessionService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, username, password } = signUpDto;

    // Check if email or username already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new BadRequestException('Email or username already exists');
    }

    // Create new user
    const user = this.userRepository.create({
      email,
      username,
      password, // will be hashed automatically via entity hooks
    });

    await this.userRepository.save(user);

    // Strip sensitive information
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto, req: any) {
    const { email, password, walletAddress } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create session and generate tokens
    const tokens = await this.sessionService.createSession(
      user,
      req,
      walletAddress,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async validateUserByJwt(payload: any) {
    const { sub } = payload;

    const user = await this.userRepository.findOne({
      where: { id: sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
