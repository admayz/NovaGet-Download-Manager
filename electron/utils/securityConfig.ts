/**
 * Security Configuration - Centralized security settings for Electron app
 * Implements security best practices including CSP, context isolation, and more
 * Requirements: 1.1
 */

import { session, Session } from 'electron';

export interface SecurityConfig {
  contextIsolation: boolean;
  nodeIntegration: boolean;
  sandbox: boolean;
  webSecurity: boolean;
  allowRunningInsecureContent: boolean;
  enableRemoteModule: boolean;
}

export class SecurityManager {
  /**
   * Default security configuration following Electron best practices
   */
  static readonly DEFAULT_CONFIG: SecurityConfig = {
    contextIsolation: true,      // Isolate preload scripts from renderer
    nodeIntegration: false,       // Disable Node.js in renderer
    sandbox: true,                // Enable Chromium sandbox
    webSecurity: true,            // Enable web security features
    allowRunningInsecureContent: false,  // Block mixed content
    enableRemoteModule: false,    // Disable deprecated remote module
  };

  /**
   * Content Security Policy for the application
   * Restricts what resources can be loaded and from where
   */
  static readonly CSP_POLICY = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",  // Required for Next.js in development
      "'unsafe-eval'",    // Required for Next.js in development
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",  // Required for styled-jsx and Tailwind
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],
    'font-src': [
      "'self'",
      'data:',
    ],
    'connect-src': [
      "'self'",
      'https://text.pollinations.ai',  // AI service
      'ws://localhost:*',              // WebSocket for dev
      'http://localhost:*',            // Dev server
    ],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  /**
   * Production CSP (stricter than development)
   */
  static readonly CSP_POLICY_PRODUCTION = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],  // Keep for Tailwind
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://text.pollinations.ai',
    ],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  /**
   * Generates CSP header string from policy object
   */
  private static generateCSPString(policy: Record<string, string[]>): string {
    return Object.entries(policy)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');
  }

  /**
   * Applies security headers to the session
   */
  static applySecurityHeaders(sess: Session, isDevelopment: boolean = false): void {
    // Set Content Security Policy
    const cspPolicy = isDevelopment ? this.CSP_POLICY : this.CSP_POLICY_PRODUCTION;
    const cspString = this.generateCSPString(cspPolicy);

    sess.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [cspString],
          'X-Content-Type-Options': ['nosniff'],
          'X-Frame-Options': ['DENY'],
          'X-XSS-Protection': ['1; mode=block'],
          'Referrer-Policy': ['strict-origin-when-cross-origin'],
          'Permissions-Policy': [
            'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
          ],
        },
      });
    });

    console.log('Security headers applied');
  }

  /**
   * Configures session security settings
   */
  static configureSession(sess: Session): void {
    // Clear cache on startup for security
    sess.clearCache();

    // Disable web SQL (deprecated and insecure)
    sess.webRequest.onBeforeRequest((details, callback) => {
      if (details.url.includes('websql')) {
        callback({ cancel: true });
      } else {
        callback({});
      }
    });

    // Set secure cookie policy
    sess.cookies.on('changed', (event, cookie, cause, removed) => {
      if (!removed && !cookie.secure && cookie.domain !== 'localhost') {
        console.warn(`Insecure cookie detected: ${cookie.name}`);
      }
    });

    console.log('Session security configured');
  }

  /**
   * Validates webPreferences configuration
   */
  static validateWebPreferences(webPreferences: any): boolean {
    const config = this.DEFAULT_CONFIG;

    if (webPreferences.contextIsolation !== config.contextIsolation) {
      console.error('Security violation: contextIsolation must be true');
      return false;
    }

    if (webPreferences.nodeIntegration !== config.nodeIntegration) {
      console.error('Security violation: nodeIntegration must be false');
      return false;
    }

    if (webPreferences.sandbox !== config.sandbox) {
      console.warn('Warning: sandbox should be enabled for better security');
    }

    if (webPreferences.enableRemoteModule === true) {
      console.error('Security violation: remote module must be disabled');
      return false;
    }

    return true;
  }

  /**
   * Gets recommended webPreferences for BrowserWindow
   */
  static getSecureWebPreferences(preloadPath: string): any {
    return {
      preload: preloadPath,
      contextIsolation: this.DEFAULT_CONFIG.contextIsolation,
      nodeIntegration: this.DEFAULT_CONFIG.nodeIntegration,
      sandbox: this.DEFAULT_CONFIG.sandbox,
      webSecurity: this.DEFAULT_CONFIG.webSecurity,
      allowRunningInsecureContent: this.DEFAULT_CONFIG.allowRunningInsecureContent,
      enableRemoteModule: this.DEFAULT_CONFIG.enableRemoteModule,
      // Additional security settings
      disableBlinkFeatures: 'Auxclick',  // Disable middle-click navigation
      enableWebSQL: false,
      spellcheck: false,  // Disable spellcheck to prevent data leakage
    };
  }

  /**
   * Initializes all security measures
   */
  static initialize(isDevelopment: boolean = false): void {
    const sess = session.defaultSession;

    // Apply security headers
    this.applySecurityHeaders(sess, isDevelopment);

    // Configure session security
    this.configureSession(sess);

    // Set permissions
    this.configurePermissions(sess);

    console.log('Security manager initialized');
  }

  /**
   * Configures permission handlers
   */
  private static configurePermissions(sess: Session): void {
    // Deny all permission requests by default
    sess.setPermissionRequestHandler((webContents, permission, callback) => {
      console.warn(`Permission request denied: ${permission}`);
      callback(false);
    });

    // Deny all permission checks
    sess.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      console.warn(`Permission check denied: ${permission} from ${requestingOrigin}`);
      return false;
    });

    // Block device permission requests
    sess.setDevicePermissionHandler((details) => {
      console.warn(`Device permission denied: ${details.deviceType}`);
      return false;
    });

    console.log('Permission handlers configured');
  }

  /**
   * Validates URL before loading
   */
  static isUrlSafe(url: string, allowedOrigins: string[]): boolean {
    try {
      const parsedUrl = new URL(url);

      // Check protocol
      if (!['http:', 'https:', 'file:'].includes(parsedUrl.protocol)) {
        console.warn(`Unsafe protocol: ${parsedUrl.protocol}`);
        return false;
      }

      // Check against allowed origins
      if (allowedOrigins.length > 0) {
        const origin = parsedUrl.origin;
        if (!allowedOrigins.includes(origin)) {
          console.warn(`Origin not allowed: ${origin}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Invalid URL:', error);
      return false;
    }
  }

  /**
   * Sanitizes user input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>]/g, '')  // Remove angle brackets
      .replace(/javascript:/gi, '')  // Remove javascript: protocol
      .replace(/on\w+=/gi, '')  // Remove event handlers
      .trim();
  }
}
