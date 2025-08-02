export interface NewsCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  parentCategory?: string;
  subCategories: string[];
  confidence: number;
}