'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ResultPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    async function fetchFeedback() {
      const res = await fetch(`/api/call/feedback?sessionId=${sessionId}`);
      if (res.ok) {
        setFeedback(await res.json());
      }
      setLoading(false);
    }
    fetchFeedback();
  }, [sessionId]);

  if (!sessionId) return <div className="p-8">Invalid session.</div>;
  if (loading) return <div className="p-8">Loading...</div>;
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