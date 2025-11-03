# Category Management System

This module implements the category management system for NovaGet Download Manager, providing AI-powered file categorization and automatic folder organization.

## Components

### CategoryService

Handles file categorization with AI and fallback logic.

**Features:**
- AI-powered categorization using Pollinations.ai
- Extension-based fallback categorization
- Batch categorization support
- Category metadata (icons, colors)

**Usage:**

```typescript
import { CategoryService } from './services/category';
import { AIService } from './services/ai';

const aiService = new AIService();
const categoryService = new CategoryService(aiService);

// Detect category for a file
const result = await categoryService.detectCategory('video.mp4', true);
console.log(result.category); // 'Video'
console.log(result.confidence); // 0.95
console.log(result.source); // 'ai' or 'extension'

// Get category by extension only
const extResult = categoryService.getCategoryByExtension('.pdf');
console.log(extResult.category); // 'Belge'

// Batch categorize
const files = ['video.mp4', 'song.mp3', 'document.pdf'];
const results = await categoryService.batchDetectCategories(files);
```

### FolderOrganizer

Handles automatic folder organization based on file categories.

**Features:**
- Category-based folder creation
- Automatic file moving
- File name conflict resolution
- Configurable folder names
- Batch organization support

**Usage:**

```typescript
import { FolderOrganizer } from './services/category';
import { FileCategory } from './services/ai/types';

const organizer = new FolderOrganizer({
  enabled: true,
  baseDirectory: 'C:/Downloads',
  createSubfolders: true,
});

// Organize a single file
const result = await organizer.organizeFile(
  'C:/Downloads/video.mp4',
  FileCategory.VIDEO
);
console.log(result.newPath); // 'C:/Downloads/Videos/video.mp4'

// Get organized path without moving
const path = organizer.getOrganizedPath(
  'document.pdf',
  FileCategory.DOCUMENT,
  'C:/Downloads'
);
console.log(path); // 'C:/Downloads/Documents/document.pdf'

// Ensure all category folders exist
await organizer.ensureCategoryFolders('C:/Downloads');

// Batch organize
const files = [
  { path: 'C:/Downloads/video.mp4', category: FileCategory.VIDEO },
  { path: 'C:/Downloads/song.mp3', category: FileCategory.MUSIC },
];
const results = await organizer.batchOrganizeFiles(files);
```

## Supported Categories

- **Video** (Video): mp4, avi, mkv, mov, wmv, flv, webm, etc.
- **Müzik** (Music): mp3, wav, flac, aac, ogg, m4a, wma, etc.
- **Yazılım** (Software): exe, msi, dmg, pkg, deb, rpm, apk, etc.
- **Belge** (Document): pdf, doc, docx, txt, xls, xlsx, ppt, etc.
- **Arşiv** (Archive): zip, rar, 7z, tar, gz, bz2, xz, iso, etc.
- **Resim** (Image): jpg, jpeg, png, gif, bmp, svg, webp, etc.
- **Diğer** (Other): All other file types

## Configuration

### CategoryService Configuration

The CategoryService uses the AIService configuration for AI-powered categorization:

```typescript
const aiService = new AIService({
  apiUrl: 'https://text.pollinations.ai',
  timeout: 10000,
  maxRetries: 2,
});
```

### FolderOrganizer Configuration

```typescript
interface OrganizationConfig {
  enabled: boolean;                              // Enable/disable organization
  baseDirectory: string;                         // Base download directory
  createSubfolders: boolean;                     // Create category subfolders
  categoryFolderNames: Record<FileCategory, string>; // Custom folder names
}
```

## Integration with Download Flow

The category management system integrates with the download flow as follows:

1. **On Download Complete:**
   - CategoryService detects the file category (AI or extension-based)
   - Category is saved to the database
   - If auto-organization is enabled, FolderOrganizer moves the file

2. **On Download Add:**
   - CategoryService can pre-detect category from filename
   - FolderOrganizer can determine target path before download starts

3. **User Settings:**
   - Enable/disable AI categorization
   - Enable/disable auto folder organization
   - Customize category folder names

## Requirements Mapping

- **Requirement 6.1**: AI-powered file categorization
- **Requirement 6.2**: Fallback to extension-based categorization
- **Requirement 6.4**: Category detection within 10 seconds (with fallback)
- **Requirement 10.1**: Category-based folder creation
- **Requirement 10.2**: Automatic file organization
- **Requirement 10.3**: User-configurable organization settings

## Error Handling

Both services implement robust error handling:

- **CategoryService**: Falls back to extension-based detection if AI fails
- **FolderOrganizer**: Returns detailed error information without throwing
- File name conflicts are automatically resolved with numbered suffixes
- Missing directories are created automatically

## Performance Considerations

- **Batch Operations**: Both services support batch operations for efficiency
- **Caching**: CategoryService uses AIService's built-in caching
- **Rate Limiting**: AI requests are rate-limited through AIService
- **Async Operations**: All file operations are asynchronous

## Testing

To test the category management system:

```typescript
// Test category detection
const result = await categoryService.detectCategory('test.mp4');
assert(result.category === FileCategory.VIDEO);

// Test folder organization
const orgResult = await organizer.organizeFile(
  '/tmp/test.mp4',
  FileCategory.VIDEO,
  '/tmp/downloads'
);
assert(orgResult.success === true);
assert(orgResult.newPath.includes('Videos'));
```
