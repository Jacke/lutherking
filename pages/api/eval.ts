import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import OpenAI from 'openai';
import { db } from '../../drizzle/db';
import { sessions, callHistory } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { TranscriptionServiceFactory } from '@/lib/transcription';
import type { TranscriptionModel } from '@/lib/transcription';
import { getPCMPath, cleanupPCMFile } from '@/lib/audio/converter';

// Initialize OpenAI client for analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EvalResult {
  clarity_score: number;
  filler_words: string;
  tone: string;
  confidence: number;
  highlights: string[];
  text: string;
  transcript: string;
  duration: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, wavPath } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    console.log(`[EVAL] Starting evaluation for session: ${sessionId}`);
    
    // Get session from database
    console.log(`[EVAL] Step 1: Fetching session from database...`);
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .get();

    if (!session) {
      console.error(`[EVAL] ERROR: Session not found: ${sessionId}`);
      return res.status(404).json({ error: 'Session not found' });
    }
    console.log(`[EVAL] Session found: userId=${session.userId}, wavPath=${session.wavPath}`);

    // Use wavPath from request or session
    const audioPath = wavPath || session.wavPath;

    if (!audioPath) {
      console.error(`[EVAL] ERROR: No audio path provided`);
      return res.status(400).json({ error: 'Audio file path not found' });
    }

    if (!fs.existsSync(audioPath)) {
      console.error(`[EVAL] ERROR: Audio file does not exist: ${audioPath}`);
      return res.status(400).json({ error: `Audio file not found at path: ${audioPath}` });
    }

    const fileStats = fs.statSync(audioPath);
    console.log(`[EVAL] Audio file found: ${audioPath} (${fileStats.size} bytes)`);

    // Get transcription model from session or use default
    const transcriptionModel = (session.transcriptionModel || 'whisper') as TranscriptionModel;
    console.log(`[EVAL] Using transcription model: ${transcriptionModel}`);

    // Check API keys
    if (transcriptionModel === 'whisper' && !process.env.OPENAI_API_KEY) {
      console.error(`[EVAL] ERROR: OPENAI_API_KEY not set`);
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    if (transcriptionModel === 'scribe' && !process.env.ELEVENLABS_API_KEY) {
      console.error(`[EVAL] ERROR: ELEVENLABS_API_KEY not set`);
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    // Step 1: Transcribe audio using selected model
    console.log(`[EVAL] Step 2: Starting transcription with ${transcriptionModel}...`);
    let transcriptionResult;
    try {
      const transcriptionService = TranscriptionServiceFactory.create(transcriptionModel);
      transcriptionResult = await transcriptionService.transcribe(audioPath);
      console.log(`[EVAL] Transcription completed. Text length: ${transcriptionResult.text?.length || 0} chars`);
      if (transcriptionResult.text) {
        console.log(`[EVAL] Transcript preview: ${transcriptionResult.text.substring(0, 100)}...`);
      } else {
        console.warn(`[EVAL] WARNING: Transcription returned empty text`);
      }
    } catch (transcriptionError) {
      console.error(`[EVAL] ERROR in transcription:`, transcriptionError);
      throw new Error(`Transcription failed: ${transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'}`);
    }

    // Step 2: Analyze transcript with GPT-4
    console.log(`[EVAL] Step 3: Analyzing transcript with GPT-4...`);
    let analysisResult;
    try {
      analysisResult = await analyzeTranscript(transcriptionResult.text);
      console.log(`[EVAL] Analysis completed. Clarity: ${analysisResult.clarity_score}, Confidence: ${analysisResult.confidence}`);
    } catch (analysisError) {
      console.error(`[EVAL] ERROR in analysis:`, analysisError);
      throw new Error(`Analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
    }

    // Step 3: Calculate duration
    console.log(`[EVAL] Step 4: Calculating duration...`);
    const duration = transcriptionResult.duration || await getAudioDuration(audioPath);
    console.log(`[EVAL] Duration: ${duration} seconds`);

    // Combine results
    const evalResult: EvalResult = {
      ...analysisResult,
      transcript: transcriptionResult.text,
      duration,
    };

    // Step 4: Save to callHistory
    console.log(`[EVAL] Step 5: Saving to database...`);
    try {
      await db.insert(callHistory).values({
        userId: session.userId,
        sessionId: session.sessionId,
        challengeId: 1, // TODO: get from session
        startedAt: new Date(session.startedAt),
        endedAt: new Date(),
        clarityScore: evalResult.clarity_score,
        fillerWords: evalResult.filler_words,
        tone: evalResult.tone,
        confidence: evalResult.confidence,
        highlights: JSON.stringify(evalResult.highlights),
        feedback: evalResult.text,
        transcript: evalResult.transcript,
        transcriptionModel,
      }).run();
      console.log(`[EVAL] Successfully saved to callHistory`);
    } catch (dbError) {
      console.error(`[EVAL] ERROR saving to database:`, dbError);
      throw new Error(`Database save failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    console.log(`[EVAL] Evaluation completed successfully for session ${sessionId}`);

    // Cleanup temporary PCM file if it was created during transcription
    // This happens when Scribe model converts WebM -> PCM
    if (transcriptionModel === 'scribe' && audioPath) {
      const pcmPath = getPCMPath(audioPath);
      if (pcmPath !== audioPath) {
        // Only cleanup if the PCM path is different (meaning conversion happened)
        console.log(`[EVAL] Step 6: Cleaning up temporary PCM file...`);
        cleanupPCMFile(pcmPath);
      }
    }

    return res.status(200).json(evalResult);
  } catch (error) {
    console.error(`[EVAL] FATAL ERROR for session ${sessionId}:`, error);
    console.error(`[EVAL] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');

    // Cleanup temporary PCM file even on error
    try {
      const { wavPath } = req.body;
      const audioPath = wavPath || req.body.audioPath;
      if (audioPath) {
        const pcmPath = getPCMPath(audioPath);
        if (pcmPath !== audioPath && fs.existsSync(pcmPath)) {
          console.log(`[EVAL] Cleaning up temporary PCM file after error...`);
          cleanupPCMFile(pcmPath);
        }
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
      console.error(`[EVAL] Non-fatal cleanup error:`, cleanupError);
    }

    return res.status(500).json({
      error: 'Failed to evaluate audio',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Analyze transcript with GPT-4
 */
async function analyzeTranscript(transcript: string): Promise<Omit<EvalResult, 'transcript' | 'duration'>> {
  const prompt = `Ты эксперт по анализу публичных выступлений. Проанализируй следующую транскрипцию речи и предоставь детальную обратную связь.

Транскрипция:
"""
${transcript}
"""

Оцени речь по следующим критериям:

1. **Clarity Score** (0-100): Насколько четко и понятно человек излагает свои мысли
2. **Filler Words**: Перечисли все слова-паразиты (эм, ну, вот, типа, как бы, в общем, короче и т.д.)
3. **Tone**: Определи общий тон речи (confident/уверенный, nervous/нервный, professional/профессиональный, casual/непринужденный, enthusiastic/восторженный)
4. **Confidence** (0-100): Уровень уверенности говорящего
5. **Highlights**: 3-5 конкретных замечаний о сильных и слабых сторонах выступления
6. **Detailed Feedback**: Развернутая обратная связь на русском языке (3-5 предложений)

Верни ответ СТРОГО в формате JSON:
{
  "clarity_score": 75,
  "filler_words": "эм (3 раза), ну (2 раза), вот (5 раз)",
  "tone": "confident",
  "confidence": 80,
  "highlights": [
    "Хорошая структура презентации",
    "Слишком много пауз в середине",
    "Сильное начало и заключение"
  ],
  "text": "Ваша речь демонстрирует хорошую структуру..."
}`;

  try {
    console.log(`[GPT-4] Sending transcript for analysis (length: ${transcript.length} chars)`);
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Ты эксперт по анализу публичных выступлений. Твои ответы всегда в формате JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    console.log(`[GPT-4] Received response from OpenAI`);

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error(`[GPT-4] ERROR: No content in response`);
      throw new Error('No response from GPT-4');
    }

    console.log(`[GPT-4] Parsing JSON response...`);
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error(`[GPT-4] ERROR: Failed to parse JSON:`, parseError);
      console.error(`[GPT-4] Response content:`, content.substring(0, 500));
      throw new Error(`Failed to parse GPT-4 response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate response structure
    console.log(`[GPT-4] Validating response structure...`);
    const validationErrors: string[] = [];
    if (typeof result.clarity_score !== 'number') validationErrors.push('clarity_score is not a number');
    if (typeof result.filler_words !== 'string') validationErrors.push('filler_words is not a string');
    if (typeof result.tone !== 'string') validationErrors.push('tone is not a string');
    if (typeof result.confidence !== 'number') validationErrors.push('confidence is not a number');
    if (!Array.isArray(result.highlights)) validationErrors.push('highlights is not an array');
    if (typeof result.text !== 'string') validationErrors.push('text is not a string');

    if (validationErrors.length > 0) {
      console.error(`[GPT-4] ERROR: Invalid response structure:`, validationErrors);
      console.error(`[GPT-4] Received result:`, JSON.stringify(result, null, 2));
      throw new Error(`Invalid response structure from GPT-4: ${validationErrors.join(', ')}`);
    }

    console.log(`[GPT-4] Analysis completed successfully`);
    return result;
  } catch (error) {
    console.error(`[GPT-4] ERROR in analysis:`, error);
    console.error(`[GPT-4] Error details:`, error instanceof Error ? error.stack : 'No stack trace');

    // Return default values if analysis fails
    console.log(`[GPT-4] Returning default values due to error`);
    return {
      clarity_score: 50,
      filler_words: 'Не удалось определить',
      tone: 'neutral',
      confidence: 50,
      highlights: ['Анализ не удался, попробуйте снова'],
      text: 'К сожалению, не удалось проанализировать вашу речь. Пожалуйста, попробуйте снова.',
    };
  }
}

/**
 * Get audio duration in seconds
 * Simple implementation - just estimate from file size
 * For accurate duration, use ffprobe or audio libraries
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const stats = fs.statSync(audioPath);
    const fileSizeInBytes = stats.size;

    // Rough estimation: webm opus at ~20kbps
    // 1 second ≈ 2500 bytes
    const estimatedDuration = Math.floor(fileSizeInBytes / 2500);

    return Math.max(1, estimatedDuration); // At least 1 second
  } catch (error) {
    console.error('Duration estimation error:', error);
    return 0;
  }
}
