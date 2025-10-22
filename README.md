# Download Manager

A modern download manager application built with .NET 9 and Electron.

## Project Structure

```
DownloadManager/
├── backend/                          # .NET 9 Backend
│   ├── DownloadManager.Shared/       # Shared models and DTOs
│   ├── DownloadManager.Core/         # Core business logic and data access
│   ├── DownloadManager.Api/          # REST API (ASP.NET Core)
│   ├── DownloadManager.Service/      # Background Windows Service
│   └── DownloadManager.sln           # Solution file
└── ui/                               # Electron + React Frontend
    ├── electron/                     # Electron main process
    ├── src/                          # React application
    └── package.json
```

## Getting Started

### Prerequisites

- .NET 9 SDK
- Node.js 22+
- SQLite

### Backend Setup

```bash
cd backend
dotnet restore
dotnet build
```

### Frontend Setup

```bash
cd ui
npm install
npm run build
```

### Running the Application

#### API Server
```bash
cd backend
dotnet run --project DownloadManager.Api
```

#### Electron App (Development)
```bash
cd ui
npm run dev  # Start Vite dev server
npm run electron:dev  # In another terminal, start Electron
```

## Database

The application uses SQLite with Entity Framework Core. The database includes:

- Downloads table with full download metadata
- Download segments for multi-threaded downloads
- Scheduled downloads
- Categories for file organization
- Settings storage
- Download history
- Quarantined files

Migrations are applied automatically on application startup.

## Features Implemented

### ✅ Task 1: Project Structure and Core Infrastructure

#### Backend
- ✅ .NET 9 solution with 4 projects (Shared, Core, Api, Service)
- ✅ NuGet packages: EF Core, SQLite, Serilog, AutoMapper, FluentValidation, System.Reactive
- ✅ SQLite database with EF Core
- ✅ Complete database schema with 7 tables
- ✅ Initial migration created
- ✅ 7 default categories seeded (Video, Documents, Software, Archives, Music, Images, Other)
- ✅ Dependency injection configured
- ✅ Serilog logging configured (console + file)
- ✅ Automatic database migrations on startup

#### Frontend
- ✅ Electron + React + TypeScript application
- ✅ Redux Toolkit for state management
- ✅ React Router for navigation
- ✅ TailwindCSS v4 for styling with dark mode support
- ✅ IPC handlers for download operations
- ✅ Basic UI pages (Downloads, Settings)
- ✅ Vite build configuration
- ✅ Electron builder configuration

#### Project Organization
- ✅ Separated backend and UI into distinct folders
- ✅ Comprehensive README files for each component
- ✅ .gitignore configured

## Next Steps

Continue with **Task 2: Implement core download engine**

See [backend/README.md](backend/README.md) and [ui/README.md](ui/README.md) for detailed documentation.
