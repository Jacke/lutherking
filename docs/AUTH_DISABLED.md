# Authentication Disabled (Mock Mode)

## Current Status

Authentication has been **temporarily disabled** for development purposes. The app now uses mock authentication to allow easy testing without login.

## Mock User Details

- **Email**: test@orator.ai
- **ID**: 1 (existing user in database)
- **Credits**: 100 (set in database for testing)

## How to Re-enable Authentication

When you're ready to restore real authentication, follow these steps:

### 1. Restore API Routes

Uncomment the authentication code in these files:

#### `pages/api/credits.ts`
```typescript
// Uncomment these lines:
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth/options';

// Replace:
const user = await getMockUser();

// With:
const session = await getServerSession(req, res, authOptions);
if (!session) return res.status(401).json({ error: 'Unauthorized' });
const user = await db.select().from(users).where(eq(users.email, session.user.email)).get();
```

#### `pages/api/history.ts`
Same pattern as above.

#### `pages/api/call/start.ts`
```typescript
// Uncomment authentication check:
const session = await getServerSession(req, res, authOptions);
if (!session?.user?.email) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Replace mock user:
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, session.user.email))
  .get();
```

### 2. Restore Components

#### `components/SessionProviderWrapper.tsx`
```typescript
import { SessionProvider } from "next-auth/react";

export default function SessionProviderWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

#### `components/AppHeader.tsx`
```typescript
import { useSession } from 'next-auth/react';

export function AppHeader() {
  const { data: session } = useSession();
  // Remove: const session = { user: MOCK_USER };
  // ...
}
```

#### `components/LogoutButton.tsx`
```typescript
import { signOut } from 'next-auth/react';

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/login' })}>
      Logout
    </button>
  );
}
```

### 3. Restore Pages

#### `app/dashboard/page.tsx`
```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth/options';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  // ...
}
```

#### `app/challenge/[id]/page.tsx`
```typescript
import { useSession } from 'next-auth/react';

export default function ChallengePage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && params?.id) {
      fetchChallenge();
    }
  }, [status, params?.id]);
  // ...
}
```

### 4. Remove Mock Auth File (Optional)

You can delete `/lib/auth/mock.ts` once authentication is restored.

## Quick Search & Replace

Use your IDE's search and replace feature:

1. Search for: `// MOCK AUTH`
2. Review each occurrence
3. Uncomment the original auth code
4. Remove mock auth code

## Environment Variables

Make sure these are set in your `.env`:

```bash
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

## Testing Authentication

After re-enabling:

1. Visit `/register` to create a test user
2. Visit `/login` to sign in
3. Protected routes should redirect to login when not authenticated
4. Sessions should persist across page refreshes
