// import { redirect } from 'next/navigation';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '../../lib/auth/options';
import { LogoutButton } from '../../components/LogoutButton';
import { CreditsDisplay } from '../../components/CreditsDisplay';
import { BuyCreditsButton } from '../../components/BuyCreditsButton';
import Link from 'next/link';

async function fetchChallenges() {
  let url = '';
  if (typeof window === 'undefined') {
    url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/challenges`;
  } else {
    url = '/api/challenges';
  }
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function DashboardPage() {
  // MOCK AUTH - Skip authentication
  // let session = null;
  // session = await getServerSession(authOptions);
  // if (!session) redirect('/login');

  const challenges = await fetchChallenges();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Challenges</h2>
      <div className="space-y-4">
        {challenges.map((c: any) => (
          <div key={c.id} className="bg-white rounded shadow p-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-lg">{c.title}</div>
              <div className="text-gray-600 text-sm">{c.description}</div>
            </div>
            <Link href={`/challenge/${c.id}`} className="text-blue-600 hover:underline font-medium">
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
} 