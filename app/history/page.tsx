'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const res = await fetch('/api/history');
      if (res.ok) {
        setHistory(await res.json());
      }
      setLoading(false);
    }
    fetchHistory();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Call History</h1>
      <div className="bg-white rounded shadow p-6">
        {history.length === 0 ? (
          <div>No call history yet.</div>
        ) : (
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Challenge</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Clarity</th>
                <th className="p-2 text-left">Tone</th>
                <th className="p-2 text-left">Confidence</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.sessionId} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-medium">{h.challengeTitle || h.challengeId}</td>
                  <td className="p-2">{new Date(h.startedAt).toLocaleString()}</td>
                  <td className="p-2">{h.clarityScore}</td>
                  <td className="p-2">{h.tone}</td>
                  <td className="p-2">{h.confidence}</td>
                  <td className="p-2">
                    <Link href={`/result?sessionId=${h.sessionId}`} className="text-blue-600 hover:underline">
                      View Result
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 