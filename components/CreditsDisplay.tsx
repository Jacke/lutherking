'use client';
import { useEffect, useState } from 'react';

export function CreditsDisplay() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCredits() {
      const res = await fetch('/api/credits');
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
      }
      setLoading(false);
    }
    fetchCredits();
  }, []);

  return (
    <span className="text-lg font-semibold">
      {loading ? 'Loading credits...' : `Credits: ${credits ?? 0}`}
    </span>
  );
} 