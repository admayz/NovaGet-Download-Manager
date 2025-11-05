/**
 * VirusTotal Service
 * Integration with VirusTotal API v3 for security scanning
 * Requirements: 1.1, 15.1
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import {
  VirusTotalConfig,
  VirusTotalScanResult,
  VirusTotalFileReport,
  VirusTotalUrlReport,
  SecurityCheckResult,
  ScanType,
  ScanStatus
} from './types';
import { VirusTotalRateLimiter } from './RateLimiter';

export class VirusTotalService {
  private apiKey: string | null = null;
  private apiUrl: string;
  private timeout: number;
  private maxRetries: number;
  private axiosInstance: AxiosInstance;
  private rateLimiter: VirusTotalRateLimiter;
  private scanCache: Map<string, SecurityCheckResult> = new Map();

  constructor(config: VirusTotalConfig = {}) {
    this.apiKey = config.apiKey || null;
    this.apiUrl = config.apiUrl || 'https://www.virustotal.com/api/v3';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.maxRetries = config.maxRetries || 2;

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Initialize rate limiter: 4 requests per minute (free tier)
    this.rateLimiter = new VirusTotalRateLimiter({
      maxRequests: 4,
      windowMs: 60000 // 1 minute
    });
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.axiosInstance.defaults.headers.common['x-apikey'] = apiKey;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Calculate SHA256 hash of a file
   * Requirements: 1.1, 15.1
   */
  async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => {
        hash.update(data);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Scan a URL for security threats
   * Requirements: 1.1, 15.1
   */
  async scanUrl(url: string): Promise<VirusTotalScanResult> {
    if (!this.isConfigured()) {
      throw new Error('VirusTotal API key not configured');
    }

    // Wait for rate limit clearance
    await this.rateLimiter.acquire();

    const formData = new URLSearchParams();
    formData.append('url', url);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.post('/urls', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        if (response.data && response.data.data) {
          const data = response.data.data;
          return {
            scanId: data.id,
            permalink: `https://www.virustotal.com/gui/url/${data.id}`,
            positives: 0,
            total: 0,
            scanDate: new Date().toISOString(),
            verbose_msg: 'Scan submitted successfully'
          };
        }

        throw new Error('Invalid response format from VirusTotal');
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

    throw lastError || new Error('URL scan failed');
  }

  /**
   * Get URL scan report
   * Requirements: 1.1, 15.1
   */
  async getUrlReport(url: string): Promise<SecurityCheckResult> {
    if (!this.isConfigured()) {
      throw new Error('VirusTotal API key not configured');
    }

    // Check cache first
    const cacheKey = `url:${url}`;
    const cached = this.scanCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Wait for rate limit clearance
    await this.rateLimiter.acquire();

    // Encode URL for API
    const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.get(`/urls/${urlId}`);

        if (response.data && response.data.data) {
          const data = response.data.data;
          const attributes = data.attributes;
          const stats = attributes.last_analysis_stats || {};

          const positives = stats.malicious || 0;
          const total = Object.values(stats).reduce((sum: number, val: any) => sum + (val || 0), 0);

          const threats: string[] = [];
          if (attributes.last_analysis_results) {
            Object.entries(attributes.last_analysis_results).forEach(([engine, result]: [string, any]) => {
              if (result.category === 'malicious') {
                threats.push(`${engine}: ${result.result || 'Malicious'}`);
              }
            });
          }

          const result: SecurityCheckResult = {
            isSafe: positives === 0,
            positives,
            total,
            scanDate: attributes.last_analysis_date ? new Date(attributes.last_analysis_date * 1000).toISOString() : new Date().toISOString(),
            permalink: `https://www.virustotal.com/gui/url/${data.id}`,
            threats,
            scanId: data.id
          };

          // Cache the result for 1 hour
          this.scanCache.set(cacheKey, result);
          setTimeout(() => this.scanCache.delete(cacheKey), 3600000);

          return result;
        }

        throw new Error('Invalid response format from VirusTotal');
      } catch (error) {
        lastError = error as Error;

        // If resource not found, submit for scanning
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw new Error('URL not found in VirusTotal database. Please scan it first.');
        }

        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    throw lastError || new Error('Failed to get URL report');
  }

  /**
   * Get file report by hash
   * Requirements: 1.1, 15.1
   */
  async getFileReport(fileHash: string): Promise<SecurityCheckResult> {
    if (!this.isConfigured()) {
      throw new Error('VirusTotal API key not configured');
    }

    // Check cache first
    const cacheKey = `file:${fileHash}`;
    const cached = this.scanCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Wait for rate limit clearance
    await this.rateLimiter.acquire();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.get(`/files/${fileHash}`);

        if (response.data && response.data.data) {
          const data = response.data.data;
          const attributes = data.attributes;
          const stats = attributes.last_analysis_stats || {};

          const positives = stats.malicious || 0;
          const total = Object.values(stats).reduce((sum: number, val: any) => sum + (val || 0), 0);

          const threats: string[] = [];
          if (attributes.last_analysis_results) {
            Object.entries(attributes.last_analysis_results).forEach(([engine, result]: [string, any]) => {
              if (result.category === 'malicious') {
                threats.push(`${engine}: ${result.result || 'Malicious'}`);
              }
            });
          }

          const result: SecurityCheckResult = {
            isSafe: positives === 0,
            positives,
            total,
            scanDate: attributes.last_analysis_date ? new Date(attributes.last_analysis_date * 1000).toISOString() : new Date().toISOString(),
            permalink: `https://www.virustotal.com/gui/file/${fileHash}`,
            threats,
            scanId: data.id
          };

          // Cache the result for 1 hour
          this.scanCache.set(cacheKey, result);
          setTimeout(() => this.scanCache.delete(cacheKey), 3600000);

          return result;
        }

        throw new Error('Invalid response format from VirusTotal');
      } catch (error) {
        lastError = error as Error;

        // If resource not found, file is not in database
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw new Error('File not found in VirusTotal database');
        }

        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    throw lastError || new Error('Failed to get file report');
  }

  /**
   * Scan a file by uploading it (for files < 32MB)
   * Note: This is not implemented in the free tier workflow
   * as it requires file upload which is rate-limited heavily
   */
  async scanFile(filePath: string): Promise<VirusTotalScanResult> {
    throw new Error('File upload scanning is not supported in this implementation. Use hash-based scanning instead.');
  }

  /**
   * Check if a URL is safe (convenience method)
   * Requirements: 1.1, 15.1, 15.2
   */
  async isUrlSafe(url: string, timeout: number = 30000): Promise<SecurityCheckResult> {
    const startTime = Date.now();

    try {
      // Try to get existing report first
      return await this.getUrlReport(url);
    } catch (error) {
      // If not found, submit for scanning
      if ((error as Error).message.includes('not found')) {
        await this.scanUrl(url);

        // Poll for results with timeout
        while (Date.now() - startTime < timeout) {
          await this.sleep(5000); // Wait 5 seconds between polls

          try {
            return await this.getUrlReport(url);
          } catch (pollError) {
            // Continue polling if still not ready
            if (!(pollError as Error).message.includes('not found')) {
              throw pollError;
            }
          }
        }

        throw new Error('Scan timeout: Results not available within the specified time');
      }

      throw error;
    }
  }

  /**
   * Check if a file is safe by its hash
   * Requirements: 1.1, 15.1, 15.2
   */
  async isFileSafe(filePath: string): Promise<SecurityCheckResult> {
    const fileHash = await this.calculateFileHash(filePath);
    return await this.getFileReport(fileHash);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Don't retry on network errors
      if (!axiosError.response) {
        return false;
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
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  /**
   * Clear scan cache
   */
  clearCache(): void {
    this.scanCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.scanCache.size;
  }
}
