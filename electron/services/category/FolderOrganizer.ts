/**
 * Folder Organizer Service
 * Handles automatic folder organization based on categories
 * Requirements: 10.1, 10.2, 10.3
 */

import fs from 'fs';
import path from 'path';
import { FileCategory } from '../ai/types';

export interface OrganizationConfig {
  enabled: boolean;
  baseDirectory: string;
  createSubfolders: boolean;
  categoryFolderNames: Record<FileCategory, string>;
}

export interface OrganizationResult {
  success: boolean;
  originalPath: string;
  newPath: string;
  category: FileCategory;
  error?: string;
}

export class FolderOrganizer {
  private config: OrganizationConfig;

  constructor(config?: Partial<OrganizationConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      baseDirectory: config?.baseDirectory ?? '',
      createSubfolders: config?.createSubfolders ?? true,
      categoryFolderNames: config?.categoryFolderNames ?? this.getDefaultFolderNames(),
    };
  }

  /**
   * Get default folder names for each category
   */
  private getDefaultFolderNames(): Record<FileCategory, string> {
    return {
      [FileCategory.VIDEO]: 'Videos',
      [FileCategory.MUSIC]: 'Music',
      [FileCategory.SOFTWARE]: 'Software',
      [FileCategory.DOCUMENT]: 'Documents',
      [FileCategory.ARCHIVE]: 'Archives',
      [FileCategory.IMAGE]: 'Images',
      [FileCategory.OTHER]: 'Other',
    };
  }

  /**
   * Get the target directory for a category
   * Requirements: 10.1, 10.2
   */
  getTargetDirectory(category: FileCategory, baseDirectory?: string): string {
    const base = baseDirectory || this.config.baseDirectory;
    
    if (!this.config.createSubfolders) {
      return base;
    }

    const folderName = this.config.categoryFolderNames[category];
    return path.join(base, folderName);
  }

  /**
   * Organize a file into its category folder
   * Requirements: 10.1, 10.2, 10.3
   */
  async organizeFile(
    filePath: string,
    category: FileCategory,
    baseDirectory?: string
  ): Promise<OrganizationResult> {
    const originalPath = filePath;

    try {
      // Check if organization is enabled
      if (!this.config.enabled) {
        return {
          success: true,
          originalPath,
          newPath: originalPath,
          category,
        };
      }

      // Check if file exists
      if (!fs.existsSync(originalPath)) {
        throw new Error(`File not found: ${originalPath}`);
      }

      // Get target directory
      const targetDir = this.getTargetDirectory(category, baseDirectory);

      // Create target directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Get filename
      const filename = path.basename(originalPath);
      let newPath = path.join(targetDir, filename);

      // Handle file name conflicts
      newPath = this.resolveFileNameConflict(newPath);

      // Move the file
      await this.moveFile(originalPath, newPath);

      return {
        success: true,
        originalPath,
        newPath,
        category,
      };
    } catch (error) {
      return {
        success: false,
        originalPath,
        newPath: originalPath,
        category,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the organized path without actually moving the file
   * Requirements: 10.2
   */
  getOrganizedPath(
    filename: string,
    category: FileCategory,
    baseDirectory?: string
  ): string {
    if (!this.config.enabled || !this.config.createSubfolders) {
      const base = baseDirectory || this.config.baseDirectory;
      return path.join(base, filename);
    }

    const targetDir = this.getTargetDirectory(category, baseDirectory);
    return path.join(targetDir, filename);
  }

  /**
   * Ensure category folders exist
   * Requirements: 10.1
   */
  async ensureCategoryFolders(baseDirectory?: string): Promise<void> {
    if (!this.config.createSubfolders) {
      return;
    }

    const base = baseDirectory || this.config.baseDirectory;
    const categories = Object.values(FileCategory);

    for (const category of categories) {
      const targetDir = this.getTargetDirectory(category, base);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }
  }

  /**
   * Resolve file name conflicts by adding a number suffix
   */
  private resolveFileNameConflict(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return filePath;
    }

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const nameWithoutExt = path.basename(filePath, ext);

    let counter = 1;
    let newPath = filePath;

    while (fs.existsSync(newPath)) {
      newPath = path.join(dir, `${nameWithoutExt} (${counter})${ext}`);
      counter++;
    }

    return newPath;
  }

  /**
   * Move file from source to destination
   */
  private async moveFile(source: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try rename first (faster if on same filesystem)
      fs.rename(source, destination, (renameError) => {
        if (!renameError) {
          resolve();
          return;
        }

        // If rename fails, copy and delete
        const readStream = fs.createReadStream(source);
        const writeStream = fs.createWriteStream(destination);

        readStream.on('error', reject);
        writeStream.on('error', reject);

        writeStream.on('finish', () => {
          // Delete source file after successful copy
          fs.unlink(source, (unlinkError) => {
            if (unlinkError) {
              reject(unlinkError);
            } else {
              resolve();
            }
          });
        });

        readStream.pipe(writeStream);
      });
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OrganizationConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): OrganizationConfig {
    return { ...this.config };
  }

  /**
   * Enable or disable organization
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if organization is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Set base directory
   */
  setBaseDirectory(directory: string): void {
    this.config.baseDirectory = directory;
  }

  /**
   * Get category folder name
   */
  getCategoryFolderName(category: FileCategory): string {
    return this.config.categoryFolderNames[category];
  }

  /**
   * Set custom folder name for a category
   */
  setCategoryFolderName(category: FileCategory, folderName: string): void {
    this.config.categoryFolderNames[category] = folderName;
  }

  /**
   * Batch organize multiple files
   */
  async batchOrganizeFiles(
    files: Array<{ path: string; category: FileCategory }>,
    baseDirectory?: string
  ): Promise<OrganizationResult[]> {
    const results: OrganizationResult[] = [];

    for (const file of files) {
      const result = await this.organizeFile(
        file.path,
        file.category,
        baseDirectory
      );
      results.push(result);
    }

    return results;
  }
}
