/**
 * Category Service
 * Handles file categorization with AI and fallback logic
 * Requirements: 6.1, 6.2, 6.4
 */

import { AIService } from '../ai/AIService';
import { FileCategory } from '../ai/types';
import path from 'path';

export interface CategoryDetectionResult {
  category: FileCategory;
  confidence: number;
  source: 'ai' | 'extension' | 'default';
}

export class CategoryService {
  private aiService: AIService;
  private extensionCategoryMap: Map<string, FileCategory>;

  constructor(aiService: AIService) {
    this.aiService = aiService;
    this.extensionCategoryMap = this.buildExtensionMap();
  }

  /**
   * Detect category for a file using AI with fallback to extension-based detection
   * Requirements: 6.1, 6.2, 6.4
   */
  async detectCategory(
    filename: string,
    useAI: boolean = true
  ): Promise<CategoryDetectionResult> {
    const extension = this.extractExtension(filename);

    // Try AI categorization first if enabled
    if (useAI) {
      try {
        const aiResult = await this.aiService.categorizeFile(filename, extension);
        
        // Validate AI response
        if (this.isValidCategory(aiResult.category)) {
          return {
            category: aiResult.category as FileCategory,
            confidence: aiResult.confidence,
            source: 'ai',
          };
        }
      } catch (error) {
        console.warn('AI categorization failed, falling back to extension-based:', error);
      }
    }

    // Fallback to extension-based categorization
    return this.getCategoryByExtension(extension);
  }

  /**
   * Get category based on file extension
   * Requirements: 6.2, 6.4
   */
  getCategoryByExtension(extension: string): CategoryDetectionResult {
    const ext = extension.toLowerCase().replace('.', '');
    const category = this.extensionCategoryMap.get(ext) || FileCategory.OTHER;

    return {
      category,
      confidence: category === FileCategory.OTHER ? 0.5 : 0.8,
      source: 'extension',
    };
  }

  /**
   * Extract file extension from filename
   */
  private extractExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Validate if category is a valid FileCategory
   */
  private isValidCategory(category: string): boolean {
    return Object.values(FileCategory).includes(category as FileCategory);
  }

  /**
   * Build extension to category mapping
   */
  private buildExtensionMap(): Map<string, FileCategory> {
    const map = new Map<string, FileCategory>();

    // Video extensions
    const videoExts = [
      'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v',
      'mpg', 'mpeg', '3gp', 'ogv', 'ts', 'vob', 'divx',
    ];
    videoExts.forEach((ext) => map.set(ext, FileCategory.VIDEO));

    // Music extensions
    const musicExts = [
      'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma',
      'opus', 'ape', 'alac', 'aiff', 'mid', 'midi',
    ];
    musicExts.forEach((ext) => map.set(ext, FileCategory.MUSIC));

    // Software extensions
    const softwareExts = [
      'exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'apk', 'app',
      'appimage', 'snap', 'flatpak', 'jar', 'run', 'bin',
    ];
    softwareExts.forEach((ext) => map.set(ext, FileCategory.SOFTWARE));

    // Document extensions
    const documentExts = [
      'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx',
      'ppt', 'pptx', 'csv', 'md', 'tex', 'epub', 'mobi',
    ];
    documentExts.forEach((ext) => map.set(ext, FileCategory.DOCUMENT));

    // Archive extensions
    const archiveExts = [
      'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso',
      'cab', 'lz', 'lzma', 'z', 'tgz', 'tbz2',
    ];
    archiveExts.forEach((ext) => map.set(ext, FileCategory.ARCHIVE));

    // Image extensions
    const imageExts = [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico',
      'tiff', 'tif', 'psd', 'raw', 'cr2', 'nef', 'heic', 'heif',
    ];
    imageExts.forEach((ext) => map.set(ext, FileCategory.IMAGE));

    return map;
  }

  /**
   * Get all supported categories
   */
  getSupportedCategories(): FileCategory[] {
    return Object.values(FileCategory);
  }

  /**
   * Get category icon name (for UI)
   */
  getCategoryIcon(category: FileCategory): string {
    const iconMap: Record<FileCategory, string> = {
      [FileCategory.VIDEO]: 'film',
      [FileCategory.MUSIC]: 'musical-note',
      [FileCategory.SOFTWARE]: 'code-bracket',
      [FileCategory.DOCUMENT]: 'document-text',
      [FileCategory.ARCHIVE]: 'archive-box',
      [FileCategory.IMAGE]: 'photo',
      [FileCategory.OTHER]: 'document',
    };

    return iconMap[category] || 'document';
  }

  /**
   * Get category color (for UI)
   */
  getCategoryColor(category: FileCategory): string {
    const colorMap: Record<FileCategory, string> = {
      [FileCategory.VIDEO]: 'red',
      [FileCategory.MUSIC]: 'purple',
      [FileCategory.SOFTWARE]: 'blue',
      [FileCategory.DOCUMENT]: 'green',
      [FileCategory.ARCHIVE]: 'yellow',
      [FileCategory.IMAGE]: 'pink',
      [FileCategory.OTHER]: 'gray',
    };

    return colorMap[category] || 'gray';
  }

  /**
   * Batch categorize multiple files
   */
  async batchDetectCategories(
    filenames: string[],
    useAI: boolean = true
  ): Promise<Map<string, CategoryDetectionResult>> {
    const results = new Map<string, CategoryDetectionResult>();

    // Process in parallel with rate limiting consideration
    const batchSize = 5;
    for (let i = 0; i < filenames.length; i += batchSize) {
      const batch = filenames.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (filename) => {
          const result = await this.detectCategory(filename, useAI);
          return { filename, result };
        })
      );

      batchResults.forEach(({ filename, result }) => {
        results.set(filename, result);
      });
    }

    return results;
  }
}
