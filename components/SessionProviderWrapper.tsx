'use client';

// import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

// MOCK AUTH - Disabled SessionProvider for development
// TODO: Re-enable when ready to use real authentication
export default function SessionProviderWrapper({ children }: { children: ReactNode }) {
  // return <SessionProvider>{children}</SessionProvider>;
  return <>{children}</>;
} 