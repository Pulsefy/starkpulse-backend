import { PersonalizationPreferencesDto } from "./personalization-preferences.dto";

export class FeedGenerationDto {
  userId: string;
  preferences: PersonalizationPreferencesDto;
  includeBreaking?: boolean;
  includeTrending?: boolean;
  diversityScore?: number;
  maxAge?: number;
}