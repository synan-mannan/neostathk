import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'NeoStats | Collaborative AI Project Platform',
  description: 'Enterprise multi-user project management platform with real-time sync and optimistic concurrency control',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-bg text-text antialiased selection:bg-highlight selection:text-bg">
        <AuthProvider>
          <div className="relative min-h-screen flex flex-col bg-radial-emerald bg-no-repeat bg-top">
            <Navigation />
            <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
