/**
 * Security Check Service
 * Pre-download security validation using VirusTotal
 * Requirements: 1.1, 15.1, 15.2
 */

import { VirusTotalService, SecurityCheckResult } from '../virustotal';
import { EventEmitter } from 'events';

export interface SecurityCheckOptions {
  url: string;
  timeout?: number;
  skipCheck?: boolean;
}

export interface FileSecurityCheckOptions {
  filePath: string;
  skipCheck?: boolean;
}

export interface SecurityCheckResponse {
  isAllowed: boolean;
  result?: SecurityCheckResult;
  error?: string;
  skipped?: boolean;
}

export enum SecurityAction {
  ALLOW = 'allow',
  BLOCK = 'block',
  WARN = 'warn'
}

export interface SecuritySettings {
  enabled: boolean;
  autoScan: boolean;
  blockMalicious: boolean;
  warnThreshold: number; // Number of positive detections to trigger warning
}

export class SecurityCheckService extends EventEmitter {
  private vtService: VirusTotalService;
  private settings: SecuritySettings;
  private pendingChecks: Map<string, Promise<SecurityCheckResponse>> = new Map();

  constructor(vtService: VirusTotalService, settings?: Partial<SecuritySettings>) {
    super();
    this.vtService = vtService;
    this.settings = {
      enabled: true,
      autoScan: true,
      blockMalicious: false, // Default to warn, not block
      warnThreshold: 1,
      ...settings
    };
  }

  /**
   * Check URL security before download
   * Requirements: 1.1, 15.1, 15.2
   */
  async checkUrlSecurity(options: SecurityCheckOptions): Promise<SecurityCheckResponse> {
    const { url, timeout = 30000, skipCheck = false } = options;

    // If security checks are disabled or skipped
    if (!this.settings.enabled || skipCheck) {
      return {
        isAllowed: true,
        skipped: true
      };
    }

    // If VirusTotal is not configured, allow download but emit warning
    if (!this.vtService.isConfigured()) {
      this.emit('notConfigured', { url });
      return {
        isAllowed: true,
        error: 'VirusTotal API key not configured'
      };
    }

    // Check if there's already a pending check for this URL
    const existingCheck = this.pendingChecks.get(url);
    if (existingCheck) {
      return existingCheck;
    }

    // Create new check promise
    const checkPromise = this.performSecurityCheck(url, timeout);
    this.pendingChecks.set(url, checkPromise);

    try {
      const result = await checkPromise;
      return result;
    } finally {
      // Remove from pending checks after completion
      this.pendingChecks.delete(url);
    }
  }

  /**
   * Perform the actual security check
   */
  private async performSecurityCheck(
    url: string,
    timeout: number
  ): Promise<SecurityCheckResponse> {
    try {
      this.emit('checkStarted', { url });

      // Check URL safety with timeout
      const result = await this.vtService.isUrlSafe(url, timeout);

      this.emit('checkCompleted', { url, result });

      // Determine action based on results
      const action = this.determineAction(result);

      if (action === SecurityAction.BLOCK) {
        this.emit('threatBlocked', { url, result });
        return {
          isAllowed: false,
          result,
          error: `Security threat detected: ${result.positives}/${result.total} engines flagged this URL`
        };
      }

      if (action === SecurityAction.WARN) {
        this.emit('threatWarning', { url, result });
        // Return as allowed but with warning - UI should show confirmation dialog
        return {
          isAllowed: true,
          result
        };
      }

      // Safe - allow download
      return {
        isAllowed: true,
        result
      };

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // If scan timeout or not found, allow download but log warning
      if (errorMessage.includes('timeout') || errorMessage.includes('not found')) {
        this.emit('checkTimeout', { url, error: errorMessage });
        return {
          isAllowed: true,
          error: errorMessage
        };
      }

      // For other errors, allow download but emit error event
      this.emit('checkError', { url, error: errorMessage });
      return {
        isAllowed: true,
        error: errorMessage
      };
    }
  }

  /**
   * Determine action based on scan results
   */
  private determineAction(result: SecurityCheckResult): SecurityAction {
    // If no threats detected, allow
    if (result.isSafe) {
      return SecurityAction.ALLOW;
    }

    // If blocking is enabled and threats detected, block
    if (this.settings.blockMalicious && result.positives > 0) {
      return SecurityAction.BLOCK;
    }

    // If positives exceed threshold, warn
    if (result.positives >= this.settings.warnThreshold) {
      return SecurityAction.WARN;
    }

    // Otherwise allow
    return SecurityAction.ALLOW;
  }

  /**
   * Update security settings
   */
  updateSettings(settings: Partial<SecuritySettings>): void {
    this.settings = {
      ...this.settings,
      ...settings
    };
    this.emit('settingsUpdated', this.settings);
  }

  /**
   * Get current settings
   */
  getSettings(): SecuritySettings {
    return { ...this.settings };
  }

  /**
   * Enable security checks
   */
  enable(): void {
    this.settings.enabled = true;
    this.emit('settingsUpdated', this.settings);
  }

  /**
   * Disable security checks
   */
  disable(): void {
    this.settings.enabled = false;
    this.emit('settingsUpdated', this.settings);
  }

  /**
   * Check if security checks are enabled
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Get pending checks count
   */
  getPendingChecksCount(): number {
    return this.pendingChecks.size;
  }

  /**
   * Clear all pending checks
   */
  clearPendingChecks(): void {
    this.pendingChecks.clear();
  }

  /**
   * Check file security after download
   * Requirements: 1.1, 15.1, 15.2
   */
  async checkFileSecurity(options: FileSecurityCheckOptions): Promise<SecurityCheckResponse> {
    const { filePath, skipCheck = false } = options;

    // If security checks are disabled or skipped
    if (!this.settings.enabled || skipCheck) {
      return {
        isAllowed: true,
        skipped: true
      };
    }

    // If VirusTotal is not configured, allow but emit warning
    if (!this.vtService.isConfigured()) {
      this.emit('notConfigured', { filePath });
      return {
        isAllowed: true,
        error: 'VirusTotal API key not configured'
      };
    }

    try {
      this.emit('fileCheckStarted', { filePath });

      // Calculate file hash and check
      const result = await this.vtService.isFileSafe(filePath);

      this.emit('fileCheckCompleted', { filePath, result });

      // Determine action based on results
      const action = this.determineAction(result);

      if (action === SecurityAction.BLOCK) {
        this.emit('fileThreatDetected', { filePath, result });
        return {
          isAllowed: false,
          result,
          error: `Virus detected: ${result.positives}/${result.total} engines flagged this file`
        };
      }

      if (action === SecurityAction.WARN) {
        this.emit('fileThreatWarning', { filePath, result });
        // Return as not safe but with warning - UI should show options
        return {
          isAllowed: false,
          result
        };
      }

      // Safe - file is clean
      return {
        isAllowed: true,
        result
      };

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // If file not found in database, it's likely safe (not known malware)
      if (errorMessage.includes('not found')) {
        this.emit('fileNotInDatabase', { filePath });
        return {
          isAllowed: true,
          error: 'File not found in VirusTotal database (likely safe)'
        };
      }

      // For other errors, allow but emit error event
      this.emit('fileCheckError', { filePath, error: errorMessage });
      return {
        isAllowed: true,
        error: errorMessage
      };
    }
  }

  /**
   * Calculate file hash without checking
   * Useful for displaying hash to user
   */
  async calculateFileHash(filePath: string): Promise<string> {
    return await this.vtService.calculateFileHash(filePath);
  }
}
