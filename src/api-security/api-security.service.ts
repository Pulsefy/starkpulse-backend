import { Injectable } from '@nestjs/common';
import { CreateApiSecurityDto } from './dto/create-api-security.dto';
import { UpdateApiSecurityDto } from './dto/update-api-security.dto';
import { AuthService } from 'src/auth/auth.service';
import { RateLimitService } from 'src/common/services/rate-limit.service';

@Injectable()
export class ApiSecurityService {
   constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly authService: AuthService,
  ) {}

  async handleRequest(req: Request) {
    const user = await this.authService.validateUserByJwt(req.headers['x-api-key']);
    // Define a rate limit key and config (customize as needed)
    const rateLimitKey = `user:${user.id}`;
    const rateLimitConfig = { windowMs: 60000, max: 100 }; // Example config, adjust as needed
    await this.rateLimitService.checkRateLimit(
      rateLimitKey,
      rateLimitConfig,
      Number(user.id),
      Array.isArray(user.roles) ? user.roles : [user.roles],
      (req as any).ip 
    );
    // Route request to intended microservice
  }
  create(createApiSecurityDto: CreateApiSecurityDto) {
    return 'This action adds a new apiSecurity';
  }

  findAll() {
    return `This action returns all apiSecurity`;
  }

  findOne(id: number) {
    return `This action returns a #${id} apiSecurity`;
  }

  update(id: number, updateApiSecurityDto: UpdateApiSecurityDto) {
    return `This action updates a #${id} apiSecurity`;
  }

  remove(id: number) {
    return `This action removes a #${id} apiSecurity`;
  }
}
