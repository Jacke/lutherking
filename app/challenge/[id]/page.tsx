'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// import { useSession } from 'next-auth/react';
import TranscriptionModelSelector from '@/components/TranscriptionModelSelector';

interface Challenge {
  id: number;
  title: string;
  description: string;
}

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  // MOCK AUTH - Skip authentication check
  // const { data: session, status } = useSession();
  const status = 'authenticated';
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('whisper');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // MOCK AUTH - Skip login redirect
    // if (status === 'unauthenticated') {
    //   router.push('/login');
    //   return;
    // }

    if (params?.id) {
      fetchChallenge();
    }
  }, [params?.id]);

  const fetchChallenge = async () => {
    if (!params?.id) return;

    try {
      const res = await fetch(`/api/challenges?id=${params.id}`);
      if (!res.ok) {
        throw new Error('Challenge not found');
      }
      const data = await res.json();
      setChallenge(data);
    } catch (err) {
      console.error('Error fetching challenge:', err);
      setError('Не удалось загрузить задание');
    } finally {
      setLoading(false);
    }
  };

  const startCall = async () => {
    if (!challenge) return;

    setIsStarting(true);
    setError(null);

    try {
      const res = await fetch('/api/call/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challenge.id,
          transcriptionModel: selectedModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start call');
      }

      const data = await res.json();
      router.push(`/call?sessionId=${data.sessionId}`);
    } catch (err) {
      console.error('Error starting call:', err);
      setError(err instanceof Error ? err.message : 'Не удалось начать звонок');
      setIsStarting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-2/3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Задание не найдено</h2>
          <p className="text-red-700 mb-4">{error || 'Запрошенное задание не существует'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Вернуться в Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M15 19l-7-7 7-7"></path>
          </svg>
          Назад к заданиям
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{challenge.title}</h1>
        <p className="text-lg text-gray-700">{challenge.description}</p>
      </div>

      {/* Model Selection */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <TranscriptionModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Start Button */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h3 className="text-xl font-bold mb-2">Готовы начать?</h3>
            <p className="text-blue-100 text-sm">
              Звонок будет записан и проанализирован с помощью AI
            </p>
          </div>
          <button
            onClick={startCall}
            disabled={isStarting}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors font-bold text-lg shadow-md hover:shadow-lg"
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Запуск...
              </span>
            ) : (
              'Начать звонок'
            )}
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-600">Стоимость</div>
              <div className="font-bold text-gray-900">1 кредит</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-600">AI анализ</div>
              <div className="font-bold text-gray-900">Автоматически</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-600">Результаты</div>
              <div className="font-bold text-gray-900">Мгновенно</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
