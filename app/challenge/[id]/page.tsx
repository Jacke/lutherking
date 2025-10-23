import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../pages/api/auth/[...nextauth]';

async function fetchChallenge(id: string) {
  const res = await fetch(`${process.env.NEXTAUTH_URL || ''}/api/challenges?id=${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function ChallengePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const challenge = await fetchChallenge(params.id);
  if (!challenge) notFound();

  async function startCall() {
    'use server';
    const res = await fetch('/api/call/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: params.id }),
    });
    if (res.ok) {
      const data = await res.json();
      redirect(`/call?sessionId=${data.sessionId}`);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <div className="bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-2">{challenge.title}</h1>
        <p className="mb-6 text-gray-700 text-lg">{challenge.description}</p>
        <form action={startCall}>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-lg">
            Start
          </button>
        </form>
      </div>
    </div>
  );
} 