'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditsDisplay } from './CreditsDisplay';
import { LogoutButton } from './LogoutButton';
// import { useSession } from 'next-auth/react';
import { MOCK_USER } from '../lib/auth/mock';

export function AppHeader() {
  const pathname = usePathname();
  // MOCK AUTH - Use mock session
  // const { data: session } = useSession();
  const session = { user: MOCK_USER };

  return (
    <header className="w-full bg-white border-b shadow-sm px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-blue-700">
          Orator AI
        </Link>
        <nav className="flex gap-4">
          <Link
            href="/dashboard"
            className={
              'hover:underline' + (pathname === '/dashboard' ? ' font-semibold text-blue-700' : ' text-gray-700')
            }
          >
            Dashboard
          </Link>
          <Link
            href="/history"
            className={
              'hover:underline' + (pathname === '/history' ? ' font-semibold text-blue-700' : ' text-gray-700')
            }
          >
            History
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {session?.user?.email && (
          <span className="text-sm text-gray-600">{session.user.email}</span>
        )}
        <CreditsDisplay />
        <LogoutButton />
      </div>
    </header>
  );
} 