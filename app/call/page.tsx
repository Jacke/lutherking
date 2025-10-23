'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function CallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [ending, setEnding] = useState(false);

  if (!sessionId) {
    return <div className="p-8">Invalid session.</div>;
  }

  async function handleEndCall() {
    setEnding(true);
    const res = await fetch('/api/call/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      router.push(`/result?sessionId=${sessionId}`);
    } else {
      setEnding(false);
      alert('Failed to end call.');
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Live Call</h1>
      <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center mb-8">
        {/* Audio visualizer placeholder */}
        <span className="text-gray-400">[Audio Visualizer]</span>
      </div>
      <button
        onClick={handleEndCall}
        disabled={ending}
        className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        {ending ? 'Ending...' : 'End Call'}
      </button>
    </div>
  );
} 