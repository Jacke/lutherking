import './globals.css';
import { ReactNode } from 'react';
import { AppHeader } from '../components/AppHeader';
import SessionProviderWrapper from '../components/SessionProviderWrapper';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProviderWrapper>
          <AppHeader />
          <main className="pt-4">{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
} 