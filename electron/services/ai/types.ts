/**
 * AI Service Types
 * Type definitions for AI-powered features
 */

export interface CategoryResult {
  category: string;
  confidence: number;
}

export interface NamingResult {
  suggestedName: string;
  reason: string;
}

export interface TaggingResult {
  tags: string[];
}

export enum FileCategory {
  VIDEO = 'Video',
  MUSIC = 'Müzik',
  SOFTWARE = 'Yazılım',
  DOCUMENT = 'Belge',
  ARCHIVE = 'Arşiv',
  IMAGE = 'Resim',
  OTHER = 'Diğer'
}

export interface AIServiceConfig {
  apiUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
