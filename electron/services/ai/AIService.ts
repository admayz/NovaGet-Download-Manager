/**
 * AI Service
 * Pollinations.ai integration for file categorization, naming, and tagging
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  CategoryResult,
  NamingResult,
  TaggingResult,
  FileCategory,
  AIServiceConfig
} from './types';
import { AICache } from './AICache';
import { RateLimiter } from './RateLimiter';

export class AIService {
  private apiUrl: string;
  private timeout: number;
  private maxRetries: number;
  private axiosInstance: AxiosInstance;
  private cache: AICache;
  private rateLimiter: RateLimiter;

  constructor(config: AIServiceConfig = {}) {
    this.apiUrl = config.apiUrl || 'https://text.pollinations.ai';
    this.timeout = config.timeout || 10000; // 10 seconds
    this.maxRetries = config.maxRetries || 2;

    this.axiosInstance = axios.create({
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Initialize cache with 1 hour TTL
    this.cache = new AICache(3600000);

    // Initialize rate limiter: 10 requests per minute
    this.rateLimiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 60000 // 1 minute
    });
  }

  /**
   * Categorize a file based on its name and extension
   * Requirements: 6.1, 6.2, 6.4
   */
  async categorizeFile(filename: string, extension: string): Promise<CategoryResult> {
    // Check cache first
    const cacheKey = AICache.generateKey('category', filename, extension);
    const cached = this.cache.get<CategoryResult>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const prompt = this.buildCategorizationPrompt(filename, extension);
    
    try {
      const response = await this.makeRequest(prompt);
      const result = this.parseCategorizationResponse(response, extension);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('AI categorization failed, using fallback:', error);
      return this.getFallbackCategory(extension);
    }
  }

  /**
   * Suggest a better filename based on the original name
   * Requirements: 7.1, 7.2, 7.4
   */
  async suggestFileName(originalName: string): Promise<NamingResult> {
    // Check cache first
    const cacheKey = AICache.generateKey('naming', originalName);
    const cached = this.cache.get<NamingResult>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const prompt = this.buildNamingPrompt(originalName);
    
    try {
      const response = await this.makeRequest(prompt);
      const result = this.parseNamingResponse(response, originalName);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('AI naming failed, using original:', error);
      return {
        suggestedName: originalName,
        reason: 'AI service unavailable, keeping original name'
      };
    }
  }

  /**
   * Generate tags for a file based on its name
   * Requirements: 8.1, 8.2, 8.4
   */
  async generateTags(filename: string): Promise<TaggingResult> {
    // Check cache first
    const cacheKey = AICache.generateKey('tags', filename);
    const cached = this.cache.get<TaggingResult>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const prompt = this.buildTaggingPrompt(filename);
    
    try {
      const response = await this.makeRequest(prompt);
      const result = this.parseTaggingResponse(response);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('AI tagging failed, using basic tags:', error);
      return this.getFallbackTags(filename);
    }
  }

  /**
   * Make a request to Pollinations.ai API with retry logic and rate limiting
   */
  private async makeRequest(prompt: string): Promise<string> {
    // Wait for rate limit clearance
    await this.rateLimiter.acquire();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.post(
          this.apiUrl,
          { prompt },
          {
            headers: {
              'Accept': 'text/plain'
            }
          }
        );

        if (response.data && typeof response.data === 'string') {
          return response.data.trim();
        }

        throw new Error('Invalid response format from AI service');
      } catch (error) {
        lastError = error as Error;
        
        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }

    throw lastError || new Error('AI request failed');
  }

  /**
   * Build categorization prompt
   */
  private buildCategorizationPrompt(filename: string, extension: string): string {
    return `Analyze this file and categorize it into ONE of these categories: Video, Müzik, Yazılım, Belge, Arşiv, Resim, Diğer.

Filename: ${filename}
Extension: ${extension}

Respond ONLY with a JSON object in this exact format:
{"category": "CategoryName", "confidence": 0.95}

The confidence should be between 0 and 1. Choose the most appropriate category based on the file extension and name.`;
  }

  /**
   * Build naming prompt
   */
  private buildNamingPrompt(originalName: string): string {
    return `Suggest a better, more descriptive filename for this file. Make it clear, concise, and professional.

Original filename: ${originalName}

Respond ONLY with a JSON object in this exact format:
{"suggestedName": "better-filename.ext", "reason": "Brief explanation"}

Keep the file extension. Use lowercase with hyphens. Make it descriptive but not too long.`;
  }

  /**
   * Build tagging prompt
   */
  private buildTaggingPrompt(filename: string): string {
    return `Generate up to 5 relevant tags/keywords for this file based on its name.

Filename: ${filename}

Respond ONLY with a JSON object in this exact format:
{"tags": ["tag1", "tag2", "tag3"]}

Tags should be:
- Relevant to the file content
- Single words or short phrases
- Lowercase
- Maximum 5 tags`;
  }

  /**
   * Parse categorization response
   */
  private parseCategorizationResponse(response: string, extension: string): CategoryResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[^}]+\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.category && typeof parsed.confidence === 'number') {
        // Validate category
        const validCategories = Object.values(FileCategory);
        if (validCategories.includes(parsed.category)) {
          return {
            category: parsed.category,
            confidence: Math.max(0, Math.min(1, parsed.confidence))
          };
        }
      }

      throw new Error('Invalid category format');
    } catch (error) {
      console.error('Failed to parse categorization response:', error);
      return this.getFallbackCategory(extension);
    }
  }

  /**
   * Parse naming response
   */
  private parseNamingResponse(response: string, originalName: string): NamingResult {
    try {
      const jsonMatch = response.match(/\{[^}]+\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.suggestedName && parsed.reason) {
        return {
          suggestedName: parsed.suggestedName,
          reason: parsed.reason
        };
      }

      throw new Error('Invalid naming format');
    } catch (error) {
      console.error('Failed to parse naming response:', error);
      return {
        suggestedName: originalName,
        reason: 'Failed to parse AI response'
      };
    }
  }

  /**
   * Parse tagging response
   */
  private parseTaggingResponse(response: string): TaggingResult {
    try {
      const jsonMatch = response.match(/\{[^}]+\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (Array.isArray(parsed.tags)) {
        return {
          tags: parsed.tags.slice(0, 5).filter((tag: any) => typeof tag === 'string')
        };
      }

      throw new Error('Invalid tagging format');
    } catch (error) {
      console.error('Failed to parse tagging response:', error);
      return { tags: [] };
    }
  }

  /**
   * Get fallback category based on file extension
   */
  private getFallbackCategory(extension: string): CategoryResult {
    const ext = extension.toLowerCase().replace('.', '');
    
    const categoryMap: Record<string, FileCategory> = {
      // Video
      'mp4': FileCategory.VIDEO,
      'avi': FileCategory.VIDEO,
      'mkv': FileCategory.VIDEO,
      'mov': FileCategory.VIDEO,
      'wmv': FileCategory.VIDEO,
      'flv': FileCategory.VIDEO,
      'webm': FileCategory.VIDEO,
      'm4v': FileCategory.VIDEO,
      
      // Music
      'mp3': FileCategory.MUSIC,
      'wav': FileCategory.MUSIC,
      'flac': FileCategory.MUSIC,
      'aac': FileCategory.MUSIC,
      'ogg': FileCategory.MUSIC,
      'm4a': FileCategory.MUSIC,
      'wma': FileCategory.MUSIC,
      
      // Software
      'exe': FileCategory.SOFTWARE,
      'msi': FileCategory.SOFTWARE,
      'dmg': FileCategory.SOFTWARE,
      'pkg': FileCategory.SOFTWARE,
      'deb': FileCategory.SOFTWARE,
      'rpm': FileCategory.SOFTWARE,
      'apk': FileCategory.SOFTWARE,
      'app': FileCategory.SOFTWARE,
      
      // Document
      'pdf': FileCategory.DOCUMENT,
      'doc': FileCategory.DOCUMENT,
      'docx': FileCategory.DOCUMENT,
      'txt': FileCategory.DOCUMENT,
      'rtf': FileCategory.DOCUMENT,
      'odt': FileCategory.DOCUMENT,
      'xls': FileCategory.DOCUMENT,
      'xlsx': FileCategory.DOCUMENT,
      'ppt': FileCategory.DOCUMENT,
      'pptx': FileCategory.DOCUMENT,
      
      // Archive
      'zip': FileCategory.ARCHIVE,
      'rar': FileCategory.ARCHIVE,
      '7z': FileCategory.ARCHIVE,
      'tar': FileCategory.ARCHIVE,
      'gz': FileCategory.ARCHIVE,
      'bz2': FileCategory.ARCHIVE,
      'xz': FileCategory.ARCHIVE,
      
      // Image
      'jpg': FileCategory.IMAGE,
      'jpeg': FileCategory.IMAGE,
      'png': FileCategory.IMAGE,
      'gif': FileCategory.IMAGE,
      'bmp': FileCategory.IMAGE,
      'svg': FileCategory.IMAGE,
      'webp': FileCategory.IMAGE,
      'ico': FileCategory.IMAGE
    };

    return {
      category: categoryMap[ext] || FileCategory.OTHER,
      confidence: 0.7
    };
  }

  /**
   * Get fallback tags based on filename
   */
  private getFallbackTags(filename: string): TaggingResult {
    const tags: string[] = [];
    const nameParts = filename
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter(part => part.length > 2);

    // Take first 5 meaningful parts as tags
    return {
      tags: nameParts.slice(0, 5)
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Retry on network errors
      if (!axiosError.response) {
        return true;
      }
      
      // Retry on 5xx server errors and 429 rate limit
      const status = axiosError.response.status;
      return status >= 500 || status === 429;
    }
    
    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache(): number {
    return this.cache.cleanup();
  }

  /**
   * Get rate limiter status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Reset rate limiter
   */
  resetRateLimiter(): void {
    this.rateLimiter.reset();
  }
}
