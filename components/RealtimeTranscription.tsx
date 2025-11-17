/**
 * Real-time transcription component using Scribe v2 WebSocket
 * 
 * Props:
 * - sessionId: Session ID for the call
 * - onTranscriptUpdate: Callback when transcript updates
 * - onError: Callback for errors
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface RealtimeTranscriptionProps {
  sessionId: string;
  audioStream: MediaStream;
  onTranscriptUpdate: (text: string, isPartial: boolean) => void;
  onError: (error: string) => void;
}

export default function RealtimeTranscription({
  sessionId,
  audioStream,
  onTranscriptUpdate,
  onError,
}: RealtimeTranscriptionProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        // Connect to our WebSocket proxy server
        // The server will handle authentication with ElevenLabs securely
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/transcribe/ws?sessionId=${sessionId}`;

        console.log('[Scribe] Connecting to WebSocket proxy:', wsUrl);
        const ws = new WebSocket(wsUrl);

        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[Scribe] WebSocket connected');
          setIsConnected(true);
          startAudioProcessing();
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch (message.message_type) {
              case 'session_started':
                console.log('[Scribe] Session started');
                break;

              case 'partial_transcript':
                // API returns "text" not "transcript"
                if (message.text && mounted) {
                  onTranscriptUpdate(message.text, true);
                }
                break;

              case 'committed_transcript':
                // API returns "text" not "transcript"
                if (message.text && mounted) {
                  onTranscriptUpdate(message.text, false);
                }
                break;

              case 'error':
                console.error('[Scribe] Error:', message.error);
                if (mounted) {
                  onError(message.error?.message || 'Transcription error');
                }
                break;
            }
          } catch (err) {
            console.error('[Scribe] Error parsing message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('[Scribe] WebSocket error:', error);
          if (mounted) {
            onError('WebSocket connection error');
          }
        };

        ws.onclose = () => {
          console.log('[Scribe] WebSocket closed');
          setIsConnected(false);
        };
      } catch (err) {
        console.error('[Scribe] Connection error:', err);
        if (mounted) {
          onError(err instanceof Error ? err.message : 'Failed to connect');
        }
      }
    };

    const startAudioProcessing = () => {
      try {
        // Create AudioContext - note: browser may not support custom sample rates
        // We'll resample in JavaScript if needed
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Create source from stream
        const source = audioContext.createMediaStreamSource(audioStream);

        // Create ScriptProcessorNode for PCM conversion (deprecated but widely supported)
        // For production, consider using AudioWorkletNode
        const bufferSize = 4096;
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;

        // Resample buffer (from source sample rate to 16kHz)
        const targetSampleRate = 16000;
        const sourceSampleRate = audioContext.sampleRate;
        const resampleRatio = sourceSampleRate / targetSampleRate;
        let resampleBuffer: Float32Array[] = [];

        processor.onaudioprocess = (e) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Resample to 16kHz if needed
            let resampledData: Float32Array;
            if (sourceSampleRate !== targetSampleRate) {
              // Simple linear resampling
              const outputLength = Math.floor(inputData.length / resampleRatio);
              resampledData = new Float32Array(outputLength);
              for (let i = 0; i < outputLength; i++) {
                const srcIndex = i * resampleRatio;
                const srcIndexFloor = Math.floor(srcIndex);
                const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
                const t = srcIndex - srcIndexFloor;
                resampledData[i] = inputData[srcIndexFloor] * (1 - t) + inputData[srcIndexCeil] * t;
              }
            } else {
              resampledData = inputData;
            }
            
            // Convert Float32Array to Int16Array (PCM)
            const pcmData = new Int16Array(resampledData.length);
            for (let i = 0; i < resampledData.length; i++) {
              // Clamp to [-1, 1] and convert to 16-bit integer
              const s = Math.max(-1, Math.min(1, resampledData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // Convert to base64 (chunked for large arrays)
            const bytes = new Uint8Array(pcmData.buffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const base64Audio = btoa(binary);

            // Send to Scribe
            wsRef.current.send(
              JSON.stringify({
                message_type: 'input_audio_chunk',
                audio_base_64: base64Audio,
                commit: false,
                sample_rate: targetSampleRate,
              })
            );
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      } catch (err) {
        console.error('[Scribe] Audio processing error:', err);
        if (mounted) {
          onError('Failed to process audio');
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Cleanup audio processing
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [sessionId, audioStream, onTranscriptUpdate, onError]);

  return null; // This component doesn't render anything
}

