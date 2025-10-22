# Download Manager - Backend

.NET 9 backend for the Download Manager application.

## Projects

### DownloadManager.Shared
Shared models, enums, and DTOs used across all projects.

**Key Models:**
- `DownloadTask` - Main download entity
- `DownloadSegment` - Download segment for multi-threaded downloads
- `ScheduledDownload` - Scheduled download configuration
- `Category` - File categorization
- `Setting` - Application settings
- `DownloadHistory` - Download event history
- `QuarantinedFile` - Quarantined malicious files

### DownloadManager.Core
Core business logic and data access layer.

**Key Components:**
- `DownloadManagerDbContext` - Entity Framework Core DbContext
- Database migrations
- Repository interfaces (to be implemented)
- Core services (to be implemented)

### DownloadManager.Api
ASP.NET Core Web API for managing downloads.

**Features:**
- RESTful API endpoints
- Serilog logging (console + file)
- Automatic database migrations on startup
- CORS configuration for localhost
- OpenAPI/Swagger support

**Configuration:**
- Connection string in `appsettings.json`
- Default SQLite database: `downloadmanager.db`

### DownloadManager.Service
Windows Worker Service for background download processing.

**Features:**
- Runs as Windows Service
- Processes downloads in background
- Shares database with API

## Database

SQLite database with Entity Framework Core.

**Tables:**
- `downloads` - Download tasks
- `download_segments` - Download segments
- `scheduled_downloads` - Scheduled downloads
- `categories` - File categories (7 default categories seeded)
- `settings` - Application settings
- `download_history` - Download event log
- `quarantined_files` - Quarantined files

**Default Categories:**
1. Video (mp4, avi, mkv, etc.)
2. Documents (pdf, doc, xls, etc.)
3. Software (exe, msi, dmg, etc.)
4. Archives (zip, rar, 7z, etc.)
5. Music (mp3, wav, flac, etc.)
6. Images (jpg, png, gif, etc.)
7. Other (fallback category)

## Running

### Development
```bash
dotnet run --project DownloadManager.Api
```

### Build
```bash
dotnet build
```

### Run Tests (when implemented)
```bash
dotnet test
```

## Dependencies

- Microsoft.EntityFrameworkCore.Sqlite (9.0.10)
- Microsoft.EntityFrameworkCore.Design (9.0.10)
- Serilog (4.3.0)
- Serilog.Sinks.File (7.0.0)
- Serilog.Sinks.Console (6.0.0)
- Serilog.AspNetCore (9.0.0)
- AutoMapper (15.0.1)
- FluentValidation (12.0.0)
- System.Reactive (6.1.0)

## Logging

Logs are written to:
- Console (development)
- `logs/downloadmanager-{date}.log` (rolling daily)

## Next Steps

- Implement download engine (Task 2)
- Add API controllers
- Implement repository pattern
- Add unit tests
