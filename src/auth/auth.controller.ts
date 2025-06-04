import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  Get,
  UseGuards,
  Param,
  Patch,
  Delete,
  UsePipes,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { ConfigService } from '../config/config.service';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ValidationPipe } from '../common/pipes/validation.pipe';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: 'User signup', description: 'Registers a new user.' })
  @ApiBody({ description: 'Signup payload', type: SignUpDto, example: { email: 'user@example.com', password: 'StrongPassword123!', username: 'newuser' } })
  @ApiResponse({ status: 201, description: 'User registered', example: { id: 1, email: 'user@example.com', username: 'newuser' } })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Too many signup attempts' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UsePipes(ValidationPipe)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    points: 5,
    duration: 3600,
    errorMessage: 'Too many signup attempts. Please try again later.',
  })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login', description: 'Authenticates a user and returns tokens.' })
  @ApiBody({ description: 'Login payload', type: LoginDto, example: { email: 'user@example.com', password: 'StrongPassword123!' } })
  @ApiResponse({ status: 200, description: 'Login successful', example: { accessToken: 'jwt-access-token', refreshToken: 'jwt-refresh-token' } })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UsePipes(ValidationPipe)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    points: 10,
    duration: 3600,
    errorMessage: 'Too many login attempts. Please try again later.',
  })
  async login(@Body() loginDto: LoginDto, @Req() req) {
    const result = await this.authService.login(loginDto, req);
    return result;
  }

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
