import { PartialType } from '@nestjs/mapped-types';
import { CreatePortfolioDto } from './create-portfolio.dto';

export class UpdatePortfolioDto extends PartialType(CreatePortfolioDto) {}
