'use client';
import { signOut } from 'next-auth/react';

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="px-4 py-2 border rounded bg-white hover:bg-gray-100 text-gray-700"
    >
      Logout
    </button>
  );
} 