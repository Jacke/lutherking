'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import RealtimeTranscription from '@/components/RealtimeTranscription';

export default function CallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('sessionId');

  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptionModel, setTranscriptionModel] = useState<string>('whisper');
  const [transcript, setTranscript] = useState<string>('');
  const [partialTranscript, setPartialTranscript] = useState<string>('');

  // Refs for audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch session info and start recording on mount
  useEffect(() => {
    if (!sessionId) return;
    
    const fetchSession = async () => {
      try {
        // Get session info to check transcription model
        const res = await fetch(`/api/call/info?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.transcriptionModel) {
            setTranscriptionModel(data.transcriptionModel);
          }
        }
      } catch (err) {
        console.error('Error fetching session info:', err);
      }
    };

    fetchSession();
    startRecording();

    return () => {
      stopRecording();
      cleanup();
    };
  }, [sessionId]);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;

      // Setup MediaRecorder
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await uploadAudio();
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Setup audio visualization
      setupAudioVisualization(stream);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Не удалось получить доступ к микрофону. Пожалуйста, разрешите доступ в браузере.');
    }
  };

  const setupAudioVisualization = (stream: MediaStream) => {
    if (!canvasRef.current) return;

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 2048;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(243, 244, 246)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(37, 99, 235)';
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      setError('Нет записанного аудио для загрузки');
      return;
    }

    setIsUploading(true);

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });

      // Create FormData for upload
      const formData = new FormData();
      formData.append('audio', audioBlob, `${sessionId}.webm`);
      formData.append('sessionId', sessionId!);

      // Upload to server
      const uploadRes = await fetch('/api/call/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload audio');
      }

      // End the call session
      // For Scribe model, pass the real-time transcript to avoid re-transcription
      const endRes = await fetch('/api/call/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          // Only pass transcript if using Scribe (real-time transcription)
          ...(transcriptionModel === 'scribe' && transcript && { realtimeTranscript: transcript })
        }),
      });

      if (endRes.ok) {
        router.push(`/result?sessionId=${sessionId}`);
      } else {
        throw new Error('Failed to end call session');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Не удалось загрузить аудио. Пожалуйста, попробуйте снова.');
      setIsUploading(false);
    }
  };

  const handleEndCall = () => {
    stopRecording();
  };

  const cleanup = () => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Cancel animation
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  if (!sessionId) {
    return <div className="p-8">Invalid session.</div>;
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Вернуться в Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-2">Запись звонка</h1>
      <p className="text-gray-600 mb-6">Session ID: {sessionId}</p>

      {/* Recording timer */}
      <div className="text-4xl font-mono font-bold mb-4 text-blue-600">
        {formatTime(recordingTime)}
      </div>

      {/* Audio visualizer */}
      <div className="w-full mb-8 border-2 border-gray-200 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full h-40"
        />
      </div>

      {/* Status indicator */}
      <div className="mb-6 flex items-center gap-2">
        {isRecording && (
          <>
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Идёт запись...</span>
          </>
        )}
        {isUploading && (
          <>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Загрузка аудио...</span>
          </>
        )}
      </div>

      {/* End call button */}
      <button
        onClick={handleEndCall}
        disabled={isUploading || !isRecording}
        className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {isUploading ? 'Завершение...' : 'Завершить звонок'}
      </button>

      {/* Real-time transcription display */}
      {transcriptionModel === 'scribe' && streamRef.current && (
        <div className="w-full mt-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Транскрипция в реальном времени:</div>
            <div className="text-base text-gray-900 min-h-[60px]">
              {transcript && <div className="mb-2">{transcript}</div>}
              {partialTranscript && (
                <div className="text-gray-500 italic">{partialTranscript}</div>
              )}
              {!transcript && !partialTranscript && (
                <div className="text-gray-400">Говорите, текст появится здесь...</div>
              )}
            </div>
          </div>
          <RealtimeTranscription
            sessionId={sessionId!}
            audioStream={streamRef.current}
            onTranscriptUpdate={(text, isPartial) => {
              if (isPartial) {
                setPartialTranscript(text);
              } else {
                setTranscript(prev => prev + (prev ? ' ' : '') + text);
                setPartialTranscript('');
              }
            }}
            onError={(err) => {
              console.error('Transcription error:', err);
              setError(`Ошибка транскрипции: ${err}`);
            }}
          />
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4 text-center">
        {transcriptionModel === 'scribe' 
          ? 'Транскрипция происходит в реальном времени'
          : 'Ваш голос записывается и будет проанализирован AI после завершения звонка'}
      </p>
    </div>
  );
} 