# VirusTotal Service

Integration with VirusTotal API v3 for security scanning of downloads.

## Features

- **URL Scanning**: Scan URLs before downloading
- **File Hash Scanning**: Check downloaded files by SHA256 hash
- **Rate Limiting**: Automatic rate limiting (4 requests/minute for free tier)
- **Caching**: Results cached for 1 hour to reduce API calls
- **Retry Logic**: Automatic retry with exponential backoff
- **Security Reports**: Detailed threat information from multiple antivirus engines

## Requirements

- VirusTotal API key (free tier: 4 requests/minute)
- Requirements: 1.1, 15.1

## Usage

### Initialize Service

```typescript
import { VirusTotalService } from './services/virustotal';

const vtService = new VirusTotalService({
  apiKey: 'your-api-key-here',
  timeout: 30000,
  maxRetries: 2
});
```

### Set API Key Later

```typescript
vtService.setApiKey('your-api-key-here');
```

### Check if URL is Safe

```typescript
try {
  const result = await vtService.isUrlSafe('https://example.com/file.exe');
  
  if (result.isSafe) {
    console.log('URL is safe to download');
  } else {
    console.log(`Warning: ${result.positives}/${result.total} engines detected threats`);
    console.log('Threats:', result.threats);
  }
} catch (error) {
  console.error('Security check failed:', error);
}
```

### Check Downloaded File

```typescript
try {
  const result = await vtService.isFileSafe('/path/to/downloaded/file.exe');
  
  if (!result.isSafe) {
    console.log(`Virus detected! ${result.positives}/${result.total} engines flagged this file`);
    console.log('Threats:', result.threats);
    console.log('Report:', result.permalink);
  }
} catch (error) {
  console.error('File scan failed:', error);
}
```

### Calculate File Hash

```typescript
const hash = await vtService.calculateFileHash('/path/to/file.exe');
console.log('SHA256:', hash);
```

### Get URL Report

```typescript
try {
  const report = await vtService.getUrlReport('https://example.com/file.exe');
  console.log('Scan results:', report);
} catch (error) {
  if (error.message.includes('not found')) {
    // URL not in database, need to scan first
    await vtService.scanUrl('https://example.com/file.exe');
  }
}
```

### Get File Report by Hash

```typescript
const hash = await vtService.calculateFileHash('/path/to/file.exe');
const report = await vtService.getFileReport(hash);
console.log('File scan results:', report);
```

### Check Rate Limit Status

```typescript
const status = vtService.getRateLimitStatus();
console.log('Remaining requests:', status.remaining);
console.log('Reset time:', new Date(status.resetTime));
console.log('Is limited:', status.isLimited);
```

### Clear Cache

```typescript
vtService.clearCache();
console.log('Cache cleared');
```

## API Response Types

### SecurityCheckResult

```typescript
interface SecurityCheckResult {
  isSafe: boolean;           // True if no threats detected
  positives: number;         // Number of engines that detected threats
  total: number;             // Total number of engines that scanned
  scanDate: string;          // ISO date string of last scan
  permalink: string;         // Link to VirusTotal report
  threats: string[];         // List of detected threats
  scanId: string;           // Scan ID for reference
}
```

## Rate Limiting

The service automatically handles rate limiting for the VirusTotal free tier:
- **Free Tier**: 4 requests per minute
- Requests are queued and executed when slots are available
- Rate limit status can be checked with `getRateLimitStatus()`

## Caching

Scan results are cached for 1 hour to reduce API calls:
- Cache key format: `url:{url}` or `file:{hash}`
- Automatic expiration after 1 hour
- Manual cache clearing with `clearCache()`

## Error Handling

The service includes comprehensive error handling:
- Network errors: No retry (fail fast)
- Server errors (5xx): Automatic retry with exponential backoff
- Rate limit (429): Automatic retry with exponential backoff
- Not found (404): Specific error message for missing resources

## Best Practices

1. **Pre-download scanning**: Scan URLs before starting downloads
2. **Post-download verification**: Always verify downloaded files by hash
3. **User confirmation**: Show security warnings and get user confirmation
4. **Timeout handling**: Use reasonable timeouts (30 seconds recommended)
5. **API key security**: Store API key securely in settings, never in code

## Limitations

- Free tier: 4 requests per minute
- File upload not supported (use hash-based scanning)
- Scan results may take time to be available (polling required)
- Cache expires after 1 hour

## Integration with Download Manager

The VirusTotalService integrates with the download workflow:

1. **Pre-download**: Check URL safety before starting download
2. **Post-download**: Verify file hash after download completes
3. **User warnings**: Display security alerts when threats detected
4. **Quarantine**: Move suspicious files to quarantine folder
