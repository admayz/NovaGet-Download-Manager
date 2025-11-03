/**
 * URL Validator - Security utility for validating and sanitizing URLs
 * Implements protocol whitelist and malicious URL detection
 * Requirements: 12.4
 */

export interface URLValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
  protocol?: string;
}

export class URLValidator {
  // Whitelist of allowed protocols
  private static readonly ALLOWED_PROTOCOLS = ['http:', 'https:', 'ftp:'];

  // Suspicious patterns that might indicate malicious URLs
  private static readonly SUSPICIOUS_PATTERNS = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
    /about:/i,
    /<script/i,
    /onclick/i,
    /onerror/i,
    /onload/i,
    /eval\(/i,
    /\.\.\/\.\.\//,  // Path traversal attempts
    /%00/,           // Null byte injection
    /%0d%0a/i,       // CRLF injection
  ];

  // Suspicious TLDs and domains often used in phishing
  private static readonly SUSPICIOUS_TLDS = [
    '.tk', '.ml', '.ga', '.cf', '.gq',  // Free TLDs often used in phishing
  ];

  // Maximum URL length to prevent DoS
  private static readonly MAX_URL_LENGTH = 2048;

  /**
   * Validates a URL against security rules
   * @param url - The URL to validate
   * @returns Validation result with sanitized URL if valid
   */
  static validate(url: string): URLValidationResult {
    // Check if URL is provided
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        error: 'URL is required and must be a string',
      };
    }

    // Trim whitespace
    const trimmedUrl = url.trim();

    // Check URL length
    if (trimmedUrl.length === 0) {
      return {
        isValid: false,
        error: 'URL cannot be empty',
      };
    }

    if (trimmedUrl.length > this.MAX_URL_LENGTH) {
      return {
        isValid: false,
        error: `URL exceeds maximum length of ${this.MAX_URL_LENGTH} characters`,
      };
    }

    // Check for suspicious patterns
    const suspiciousPatternCheck = this.checkSuspiciousPatterns(trimmedUrl);
    if (!suspiciousPatternCheck.isValid) {
      return suspiciousPatternCheck;
    }

    // Parse URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format',
      };
    }

    // Check protocol whitelist
    if (!this.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: `Protocol '${parsedUrl.protocol}' is not allowed. Allowed protocols: ${this.ALLOWED_PROTOCOLS.join(', ')}`,
      };
    }

    // Check for suspicious TLDs
    const tldCheck = this.checkSuspiciousTLD(parsedUrl.hostname);
    if (!tldCheck.isValid) {
      return tldCheck;
    }

    // Check for IP address in hostname (potential security risk)
    const ipCheck = this.checkIPAddress(parsedUrl.hostname);
    if (!ipCheck.isValid) {
      return ipCheck;
    }

    // Check for localhost/private IPs
    const privateIPCheck = this.checkPrivateIP(parsedUrl.hostname);
    if (!privateIPCheck.isValid) {
      return privateIPCheck;
    }

    // URL is valid, return sanitized version
    return {
      isValid: true,
      sanitizedUrl: parsedUrl.href,
      protocol: parsedUrl.protocol,
    };
  }

  /**
   * Checks for suspicious patterns in the URL
   */
  private static checkSuspiciousPatterns(url: string): URLValidationResult {
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(url)) {
        return {
          isValid: false,
          error: 'URL contains suspicious patterns that may indicate a security risk',
        };
      }
    }
    return { isValid: true };
  }

  /**
   * Checks if the URL uses a suspicious TLD
   */
  private static checkSuspiciousTLD(hostname: string): URLValidationResult {
    const lowerHostname = hostname.toLowerCase();
    for (const tld of this.SUSPICIOUS_TLDS) {
      if (lowerHostname.endsWith(tld)) {
        return {
          isValid: false,
          error: `Domain uses suspicious TLD '${tld}' which is commonly used in phishing attacks`,
        };
      }
    }
    return { isValid: true };
  }

  /**
   * Checks if hostname is an IP address and validates it
   */
  private static checkIPAddress(hostname: string): URLValidationResult {
    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 pattern (simplified)
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    if (ipv4Pattern.test(hostname)) {
      // Validate IPv4 octets
      const octets = hostname.split('.').map(Number);
      for (const octet of octets) {
        if (octet < 0 || octet > 255) {
          return {
            isValid: false,
            error: 'Invalid IPv4 address',
          };
        }
      }
    } else if (ipv6Pattern.test(hostname) || hostname.includes('[')) {
      // IPv6 addresses are allowed but flagged for awareness
      // In production, you might want to add more strict validation
    }

    return { isValid: true };
  }

  /**
   * Checks if the hostname is localhost or a private IP
   */
  private static checkPrivateIP(hostname: string): URLValidationResult {
    const lowerHostname = hostname.toLowerCase();

    // Check for localhost
    if (lowerHostname === 'localhost' || lowerHostname === '127.0.0.1' || lowerHostname === '::1') {
      return {
        isValid: false,
        error: 'Downloads from localhost are not allowed',
      };
    }

    // Check for private IP ranges
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // Private IP ranges:
      // 10.0.0.0 - 10.255.255.255
      // 172.16.0.0 - 172.31.255.255
      // 192.168.0.0 - 192.168.255.255
      // 169.254.0.0 - 169.254.255.255 (link-local)
      if (
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254)
      ) {
        return {
          isValid: false,
          error: 'Downloads from private IP addresses are not allowed',
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Quick validation for clipboard watcher
   * Less strict than full validation
   */
  static isLikelyDownloadURL(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();

    // Check length
    if (trimmed.length === 0 || trimmed.length > this.MAX_URL_LENGTH) {
      return false;
    }

    // Check if it starts with allowed protocols
    const startsWithProtocol = this.ALLOWED_PROTOCOLS.some(protocol =>
      trimmed.toLowerCase().startsWith(protocol)
    );

    if (!startsWithProtocol) {
      return false;
    }

    // Quick check for obvious suspicious patterns
    if (this.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(trimmed))) {
      return false;
    }

    return true;
  }

  /**
   * Extracts filename from URL
   * @param url - The URL to extract filename from
   * @returns Extracted filename or null
   */
  static extractFilename(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const segments = pathname.split('/').filter(s => s.length > 0);

      if (segments.length === 0) {
        return null;
      }

      const lastSegment = segments[segments.length - 1];

      // Remove query parameters if any
      const filename = lastSegment.split('?')[0];

      // Basic validation
      if (filename.length === 0 || filename.length > 255) {
        return null;
      }

      return filename;
    } catch {
      return null;
    }
  }
}
