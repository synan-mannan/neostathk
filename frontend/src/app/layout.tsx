import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeoStats Hackathon Starter',
  description: 'Clean, minimal full-stack starter for the NeoStats Full Stack Engineering Hackathon',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
