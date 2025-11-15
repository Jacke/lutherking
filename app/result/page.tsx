'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ResultPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('sessionId');
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetryingEvaluation, setIsRetryingEvaluation] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    
    async function fetchFeedback() {
      try {
        const res = await fetch(`/api/call/feedback?sessionId=${sessionId}`);
        if (!isMounted) return;
        
        if (res.ok) {
          const data = await res.json();
          setFeedback(data);
          setError(null);
          setLoading(false);
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          if (res.status === 404) {
            const status = errorData.status;
            setErrorStatus(status);
            setCanRetry(errorData.canRetry || false);
            
            if (status === 'evaluation_failed') {
              // Evaluation failed - don't retry automatically, show retry button
              setLoading(false);
              setError(errorData.error || 'Evaluation failed. You can try to evaluate again.');
            } else if (status === 'recording') {
              // Still recording - shouldn't happen but handle it
              setLoading(false);
              setError('Session is still recording.');
            } else if (status === 'no_audio') {
              // No audio file
              setLoading(false);
              setError('Audio file not found. Cannot generate feedback.');
            } else {
              // Feedback not ready yet - might still be processing
              if (retryCount < 5) {
                // Retry after 2 seconds
                timeoutId = setTimeout(() => {
                  if (isMounted) {
                    setRetryCount(prev => prev + 1);
                  }
                }, 2000);
                return;
              }
              setLoading(false);
              setError('Feedback is still being processed. Please wait a moment and refresh the page.');
            }
          } else {
            setLoading(false);
            setError(errorData.error || 'Failed to load feedback');
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to load feedback');
      }
    }
    
    fetchFeedback();
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionId, retryCount]);

  const handleRetryEvaluation = async () => {
    if (!sessionId) return;
    setIsRetryingEvaluation(true);
    try {
      const res = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      
      if (res.ok) {
        // Wait a moment then reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || 'Failed to retry evaluation');
        setIsRetryingEvaluation(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry evaluation');
      setIsRetryingEvaluation(false);
    }
  };

  if (!sessionId) return <div className="p-8">Invalid session.</div>;
  if (loading) return <div className="p-8">Loading feedback{retryCount > 0 ? ` (retrying ${retryCount}/5)...` : '...'}</div>;
  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <div className="text-red-800 font-semibold mb-2">{error}</div>
          {errorStatus === 'evaluation_failed' && (
            <div className="text-sm text-red-700 mb-3">
              The evaluation process failed. This can happen if there was an issue with transcription or AI analysis.
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {canRetry && (
            <button
              onClick={handleRetryEvaluation}
              disabled={isRetryingEvaluation}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isRetryingEvaluation ? 'Processing...' : 'Retry Evaluation'}
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  if (!feedback) return <div className="p-8">No feedback found.</div>;

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Session Feedback</h1>
      <div className="mb-4">
        <div><b>Clarity Score:</b> {feedback.clarityScore}</div>
        <div><b>Filler Words:</b> {feedback.fillerWords}</div>
        <div><b>Tone:</b> {feedback.tone}</div>
        <div><b>Confidence:</b> {feedback.confidence}</div>
        <div><b>Highlights:</b> <pre className="inline whitespace-pre-wrap">{feedback.highlights}</pre></div>
      </div>
      <div className="bg-gray-100 p-4 rounded">
        <b>Feedback:</b>
        <div>{feedback.feedback}</div>
      </div>
    </div>
  );
} 