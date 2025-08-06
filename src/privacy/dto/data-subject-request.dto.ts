import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum DataSubjectRequestType {
  ACCESS = 'access',
  ERASURE = 'erasure',
  PORTABILITY = 'portability',
  RECTIFICATION = 'rectification',
  RESTRICTION = 'restriction',
}

export class DataSubjectRequestDto {
  @IsString()
  userId: string;

  @IsEnum(DataSubjectRequestType)
  type: DataSubjectRequestType;

  @IsOptional()
  @IsString()
  details?: string;
}
