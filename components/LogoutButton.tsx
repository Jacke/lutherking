'use client';
// import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        // MOCK AUTH - Just redirect to home
        // signOut({ callbackUrl: '/login' })
        router.push('/');
      }}
      className="px-4 py-2 border rounded bg-white hover:bg-gray-100 text-gray-700"
    >
      Logout
    </button>
  );
} 