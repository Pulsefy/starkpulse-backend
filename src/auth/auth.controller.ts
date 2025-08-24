import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Get,
  Patch,
  Delete,
  Param,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({
    summary: 'User signup',
    description: 'Registers a new user.',
  })
  @ApiBody({
    description: 'Signup payload',
    type: SignUpDto,
    examples: {
      default: {
        value: {
          email: 'user@example.com',
          password: 'StrongPassword123!',
          username: 'newuser',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Too many signup attempts' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UsePipes(ValidationPipe)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    max: 5,
    windowMs: 3600000,
    message: 'Too many signup attempts. Please try again later.',
  })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user and returns tokens.',
  })
  @ApiBody({
    description: 'Login payload',
    type: LoginDto,
    examples: {
      default: {
        value: { email: 'user@example.com', password: 'StrongPassword123!' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UsePipes(ValidationPipe)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    max: 10,
    windowMs: 3600000,
    message: 'Too many login attempts. Please try again later.',
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
