'use client';

import { useState, useEffect } from 'react';

interface TranscriptionModel {
  id: string;
  name: string;
  description: string;
  available: boolean;
  supportsStreaming: boolean;
  features: string[];
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  className?: string;
}

export default function TranscriptionModelSelector({
  selectedModel,
  onModelChange,
  className = '',
}: ModelSelectorProps) {
  const [models, setModels] = useState<TranscriptionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/transcription/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setModels(data.models);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Не удалось загрузить модели транскрипции');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        Модель транскрипции
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => model.available && onModelChange(model.id)}
            disabled={!model.available}
            className={`
              relative p-5 rounded-xl border-2 text-left transition-all duration-200
              ${
                selectedModel === model.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }
              ${!model.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* Selection indicator */}
            {selectedModel === model.id && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
            )}

            {/* Model name */}
            <div className="mb-2 pr-8">
              <h3 className="font-bold text-lg text-gray-900">{model.name}</h3>
              {model.supportsStreaming && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                  Real-time
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-3">{model.description}</p>

            {/* Features */}
            <div className="flex flex-wrap gap-1.5">
              {model.features.map((feature, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Unavailable overlay */}
            {!model.available && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                <span className="px-3 py-1.5 bg-gray-800 text-white text-sm font-medium rounded-lg">
                  API ключ не настроен
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Help text */}
      <p className="mt-3 text-xs text-gray-500">
        Выберите модель для транскрипции вашей записи. Модели требуют соответствующих API ключей.
      </p>
    </div>
  );
}
