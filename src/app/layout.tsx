import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';
import { ThemeProvider } from '@/components/ThemeProvider';
import { IPCProvider } from '@/components/IPCProvider';
import { PageTransition } from '@/components/PageTransition';
import { ErrorBoundary, ToastProvider } from '@/components';

export const metadata: Metadata = {
  title: 'NovaGet - Download Manager',
  description: 'Modern download manager with AI-powered features',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <IPCProvider>
                <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
                  <Navigation />
                  <main className="flex-1 overflow-y-auto custom-scrollbar will-change-scroll smooth-scroll">
                    <PageTransition>{children}</PageTransition>
                  </main>
                </div>
              </IPCProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
