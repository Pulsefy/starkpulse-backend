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

  @IsOptional()
  language?: string;

  @IsOptional()
  notificationPreferences?: Record<string, boolean>;

  @IsOptional()
  dashboardLayout?: any;

  @IsOptional()
  betaFeatures?: Record<string, boolean>;
}
