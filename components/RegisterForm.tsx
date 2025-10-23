'use client';
import { useState } from 'react';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      window.location.href = '/login';
    } else {
      const data = await res.json();
      setError(data.error || 'Registration failed');
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4 w-80 p-8 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full border rounded px-3 py-2"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        className="w-full border rounded px-3 py-2"
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
} 