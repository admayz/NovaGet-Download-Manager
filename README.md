# NovaGet - Modern Download Manager

NovaGet is a modern download manager built with Electron.js and Next.js, featuring AI-powered file organization.

## Features

- Multi-segment parallel downloading
- Pause/Resume support
- Speed limiting
- AI-powered categorization and tagging
- Browser extension integration
- Scheduled downloads
- Modern UI with dark mode

## Tech Stack

- **Desktop Framework**: Electron 28+
- **UI Framework**: Next.js 15 + React 19
- **Styling**: TailwindCSS 4
- **State Management**: Zustand
- **Database**: better-sqlite3
- **Language**: TypeScript 5+

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package:win   # Windows
npm run package:mac   # macOS
npm run package:linux # Linux
```

## Project Structure

```
novaget/
├── electron/          # Electron main process
│   ├── index.ts      # Main entry point
│   └── preload.ts    # Preload script
├── src/              # Next.js application
│   ├── app/          # App router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities
│   ├── store/        # Zustand stores
│   └── types/        # TypeScript types
├── dist/             # Compiled Electron code
├── out/              # Next.js build output
└── release/          # Packaged applications
```

## License

MIT
