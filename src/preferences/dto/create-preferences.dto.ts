import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class CreatePreferencesDto {
  @IsEnum(['light', 'dark'])
  theme: 'light' | 'dark';

  @IsBoolean()
  emailNotifications: boolean;

  @IsBoolean()
  pushNotifications: boolean;

  @IsBoolean()
  isProfilePublic: boolean;

  @IsBoolean()
  syncAcrossDevices: boolean;
}
