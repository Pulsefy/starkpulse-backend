import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateContractDto {
  @IsString()
  address: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  abi?: string;

  @IsArray()
  @IsOptional()
  monitoredEvents?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateContractDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  abi?: string;

  @IsArray()
  @IsOptional()
  monitoredEvents?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ContractFilterDto {
  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
