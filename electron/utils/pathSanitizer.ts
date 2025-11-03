/**
 * Path Sanitizer - Security utility for sanitizing file paths and filenames
 * Implements directory traversal prevention and safe filename generation
 * Requirements: 10.2
 */

import * as path from 'path';
import * as fs from 'fs';

export interface PathValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedPath?: string;
}

export class PathSanitizer {
  // Characters not allowed in filenames (Windows + Unix)
  private static readonly INVALID_FILENAME_CHARS = /[<>:"|?*\x00-\x1F]/g;

  // Reserved Windows filenames
  private static readonly RESERVED_NAMES = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
  ];

  // Maximum filename length (most filesystems support 255)
  private static readonly MAX_FILENAME_LENGTH = 255;

  // Maximum path length (Windows has 260 char limit, but we use 255 for safety)
  private static readonly MAX_PATH_LENGTH = 255;

  /**
   * Sanitizes a filename to be safe for filesystem operations
   * @param filename - The filename to sanitize
   * @param replacement - Character to replace invalid chars with (default: '_')
   * @returns Sanitized filename
   */
  static sanitizeFilename(filename: string, replacement: string = '_'): string {
    if (!filename || typeof filename !== 'string') {
      return 'download';
    }

    let sanitized = filename.trim();

    // Remove or replace invalid characters
    sanitized = sanitized.replace(this.INVALID_FILENAME_CHARS, replacement);

    // Remove leading/trailing dots and spaces (Windows doesn't allow these)
    sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

    // Handle path separators (prevent directory traversal)
    sanitized = sanitized.replace(/[/\\]/g, replacement);

    // Check for reserved names (Windows)
    const nameWithoutExt = sanitized.split('.')[0].toUpperCase();
    if (this.RESERVED_NAMES.includes(nameWithoutExt)) {
      sanitized = `${replacement}${sanitized}`;
    }

    // Ensure filename is not empty
    if (sanitized.length === 0) {
      sanitized = 'download';
    }

    // Truncate if too long (preserve extension if possible)
    if (sanitized.length > this.MAX_FILENAME_LENGTH) {
      const ext = path.extname(sanitized);
      const nameWithoutExt = sanitized.slice(0, sanitized.length - ext.length);
      const maxNameLength = this.MAX_FILENAME_LENGTH - ext.length;
      sanitized = nameWithoutExt.slice(0, maxNameLength) + ext;
    }

    return sanitized;
  }

  /**
   * Validates and sanitizes a directory path
   * @param dirPath - The directory path to validate
   * @param baseDir - Optional base directory to restrict paths to
   * @returns Validation result with sanitized path
   */
  static validateDirectory(dirPath: string, baseDir?: string): PathValidationResult {
    if (!dirPath || typeof dirPath !== 'string') {
      return {
        isValid: false,
        error: 'Directory path is required and must be a string',
      };
    }

    const trimmedPath = dirPath.trim();

    if (trimmedPath.length === 0) {
      return {
        isValid: false,
        error: 'Directory path cannot be empty',
      };
    }

    // Check path length
    if (trimmedPath.length > this.MAX_PATH_LENGTH) {
      return {
        isValid: false,
        error: `Path exceeds maximum length of ${this.MAX_PATH_LENGTH} characters`,
      };
    }

    // Resolve to absolute path
    let absolutePath: string;
    try {
      absolutePath = path.resolve(trimmedPath);
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid path format',
      };
    }

    // Check for directory traversal attempts
    const traversalCheck = this.checkDirectoryTraversal(absolutePath, trimmedPath);
    if (!traversalCheck.isValid) {
      return traversalCheck;
    }

    // If baseDir is provided, ensure path is within it
    if (baseDir) {
      const resolvedBase = path.resolve(baseDir);
      const relativePath = path.relative(resolvedBase, absolutePath);

      // If relative path starts with '..' or is absolute, it's outside baseDir
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return {
          isValid: false,
          error: 'Path is outside allowed directory',
        };
      }
    }

    return {
      isValid: true,
      sanitizedPath: absolutePath,
    };
  }

  /**
   * Checks for directory traversal attempts
   */
  private static checkDirectoryTraversal(absolutePath: string, originalPath: string): PathValidationResult {
    // Check for common traversal patterns
    const traversalPatterns = [
      /\.\.[/\\]/,     // ../
      /[/\\]\.\./,     // /..
      /%2e%2e/i,       // URL encoded ..
      /%252e%252e/i,   // Double URL encoded ..
      /\.\.%2f/i,      // ..%2f
      /\.\.%5c/i,      // ..%5c
    ];

    for (const pattern of traversalPatterns) {
      if (pattern.test(originalPath)) {
        return {
          isValid: false,
          error: 'Path contains directory traversal patterns',
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Combines directory and filename safely
   * @param directory - The directory path
   * @param filename - The filename
   * @returns Safe combined path
   */
  static combinePath(directory: string, filename: string): PathValidationResult {
    // Validate directory
    const dirValidation = this.validateDirectory(directory);
    if (!dirValidation.isValid) {
      return dirValidation;
    }

    // Sanitize filename
    const sanitizedFilename = this.sanitizeFilename(filename);

    // Combine paths
    const combinedPath = path.join(dirValidation.sanitizedPath!, sanitizedFilename);

    // Ensure the combined path is still within the directory
    const resolvedCombined = path.resolve(combinedPath);
    const resolvedDir = path.resolve(dirValidation.sanitizedPath!);

    if (!resolvedCombined.startsWith(resolvedDir)) {
      return {
        isValid: false,
        error: 'Combined path escapes the target directory',
      };
    }

    return {
      isValid: true,
      sanitizedPath: resolvedCombined,
    };
  }

  /**
   * Generates a unique filename if file already exists
   * @param directory - The directory path
   * @param filename - The desired filename
   * @returns Unique filename
   */
  static generateUniqueFilename(directory: string, filename: string): string {
    const sanitizedFilename = this.sanitizeFilename(filename);
    let finalPath = path.join(directory, sanitizedFilename);

    // If file doesn't exist, return as is
    if (!fs.existsSync(finalPath)) {
      return sanitizedFilename;
    }

    // File exists, generate unique name
    const ext = path.extname(sanitizedFilename);
    const nameWithoutExt = sanitizedFilename.slice(0, sanitizedFilename.length - ext.length);

    let counter = 1;
    let uniqueFilename: string;

    do {
      uniqueFilename = `${nameWithoutExt} (${counter})${ext}`;
      finalPath = path.join(directory, uniqueFilename);
      counter++;
    } while (fs.existsSync(finalPath) && counter < 1000); // Limit to prevent infinite loop

    return uniqueFilename;
  }

  /**
   * Validates a complete file path (directory + filename)
   * @param filePath - The complete file path
   * @param baseDir - Optional base directory to restrict paths to
   * @returns Validation result
   */
  static validateFilePath(filePath: string, baseDir?: string): PathValidationResult {
    if (!filePath || typeof filePath !== 'string') {
      return {
        isValid: false,
        error: 'File path is required and must be a string',
      };
    }

    const directory = path.dirname(filePath);
    const filename = path.basename(filePath);

    // Validate directory
    const dirValidation = this.validateDirectory(directory, baseDir);
    if (!dirValidation.isValid) {
      return dirValidation;
    }

    // Validate filename
    const sanitizedFilename = this.sanitizeFilename(filename);
    if (sanitizedFilename !== filename) {
      return {
        isValid: false,
        error: 'Filename contains invalid characters',
      };
    }

    // Combine and validate
    return this.combinePath(directory, filename);
  }

  /**
   * Extracts safe filename from URL or path
   * @param urlOrPath - URL or path string
   * @returns Safe filename
   */
  static extractSafeFilename(urlOrPath: string): string {
    if (!urlOrPath || typeof urlOrPath !== 'string') {
      return 'download';
    }

    try {
      // Try to parse as URL first
      const url = new URL(urlOrPath);
      const pathname = url.pathname;
      const segments = pathname.split('/').filter(s => s.length > 0);

      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        // Remove query parameters
        const filename = lastSegment.split('?')[0];
        return this.sanitizeFilename(decodeURIComponent(filename));
      }
    } catch {
      // Not a valid URL, treat as path
      const filename = path.basename(urlOrPath);
      return this.sanitizeFilename(filename);
    }

    return 'download';
  }

  /**
   * Checks if a path is safe (no traversal, within bounds)
   * @param targetPath - The path to check
   * @param baseDir - Base directory to check against
   * @returns True if path is safe
   */
  static isSafePath(targetPath: string, baseDir: string): boolean {
    try {
      const resolvedTarget = path.resolve(targetPath);
      const resolvedBase = path.resolve(baseDir);
      const relativePath = path.relative(resolvedBase, resolvedTarget);

      // Path is safe if it doesn't start with '..' and isn't absolute
      return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    } catch {
      return false;
    }
  }
}
