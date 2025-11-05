/**
 * VirusTotal Service Types
 */

export interface VirusTotalConfig {
  apiKey?: string;
  apiUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface VirusTotalScanResult {
  scanId: string;
  permalink: string;
  positives: number;
  total: number;
  scanDate: string;
  verbose_msg: string;
}

export interface VirusTotalFileReport {
  response_code: number;
  verbose_msg: string;
  resource: string;
  scan_id: string;
  md5: string;
  sha1: string;
  sha256: string;
  scan_date: string;
  positives: number;
  total: number;
  scans: Record<string, ScanEngine>;
  permalink: string;
}

export interface ScanEngine {
  detected: boolean;
  version: string;
  result: string | null;
  update: string;
}

export interface VirusTotalUrlReport {
  response_code: number;
  verbose_msg: string;
  resource: string;
  scan_id: string;
  scan_date: string;
  url: string;
  positives: number;
  total: number;
  scans: Record<string, ScanEngine>;
  permalink: string;
}

export interface ScanStatus {
  isScanning: boolean;
  scanId?: string;
  progress?: number;
}

export interface SecurityCheckResult {
  isSafe: boolean;
  positives: number;
  total: number;
  scanDate: string;
  permalink: string;
  threats: string[];
  scanId: string;
}

export enum ScanType {
  URL = 'url',
  FILE = 'file'
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: number;
  isLimited: boolean;
}
