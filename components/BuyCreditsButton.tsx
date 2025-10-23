'use client';
import { useState } from 'react';

export function BuyCreditsButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/payments/stripe?email=${encodeURIComponent(email)}&credits=${amount}`);
    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url;
    } else {
      setError('Failed to create checkout session');
    }
    setLoading(false);
  }

  return (
    <>
      <button
        className="px-4 py-2 bg-green-600 text-white rounded"
        onClick={() => setOpen(true)}
      >
        Buy Credits
      </button>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded shadow p-6 w-80">
            <div className="font-bold text-lg mb-2">Buy Credits</div>
            <label className="block mb-2 font-medium">Amount</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full border rounded px-3 py-2 mb-2"
            />
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleBuy}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded"
              >
                {loading ? 'Redirecting...' : 'Checkout'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 