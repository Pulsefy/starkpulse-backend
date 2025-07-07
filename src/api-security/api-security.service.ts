import { Injectable } from '@nestjs/common';
import { CreateApiSecurityDto } from './dto/create-api-security.dto';
import { UpdateApiSecurityDto } from './dto/update-api-security.dto';

@Injectable()
export class ApiSecurityService {
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
