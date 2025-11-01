import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import OpenAI from 'openai';
import { db } from '../../drizzle/db';
import { sessions, callHistory } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Initialize OpenAI client
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
    // Get session from database
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .get();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Use wavPath from request or session
    const audioPath = wavPath || session.wavPath;

    if (!audioPath || !fs.existsSync(audioPath)) {
      return res.status(400).json({ error: 'Audio file not found' });
    }

    console.log(`Starting evaluation for session ${sessionId}`);
    console.log(`Audio file: ${audioPath}`);

    // Step 1: Transcribe audio with Whisper
    const transcriptionResult = await transcribeAudio(audioPath);

    // Step 2: Analyze transcript with GPT-4
    const analysisResult = await analyzeTranscript(transcriptionResult.text);

    // Step 3: Calculate duration
    const duration = await getAudioDuration(audioPath);

    // Combine results
    const evalResult: EvalResult = {
      ...analysisResult,
      transcript: transcriptionResult.text,
      duration,
    };

    // Step 4: Save to callHistory
    await db.insert(callHistory).values({
      userId: session.userId,
      sessionId: session.sessionId,
      challengeId: 1, // TODO: get from session
      startedAt: session.startedAt,
      endedAt: Date.now(),
      clarityScore: evalResult.clarity_score,
      fillerWords: evalResult.filler_words,
      tone: evalResult.tone,
      confidence: evalResult.confidence,
      highlights: JSON.stringify(evalResult.highlights),
      feedback: evalResult.text,
    }).run();

    console.log(`Evaluation completed for session ${sessionId}`);

    return res.status(200).json(evalResult);
  } catch (error) {
    console.error('Eval error:', error);
    return res.status(500).json({
      error: 'Failed to evaluate audio',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeAudio(audioPath: string): Promise<{ text: string }> {
  try {
    const audioFile = fs.createReadStream(audioPath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ru', // Russian, change if needed
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    return {
      text: transcription.text || '',
    };
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error('Failed to transcribe audio');
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

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from GPT-4');
    }

    const result = JSON.parse(content);

    // Validate response structure
    if (
      typeof result.clarity_score !== 'number' ||
      typeof result.filler_words !== 'string' ||
      typeof result.tone !== 'string' ||
      typeof result.confidence !== 'number' ||
      !Array.isArray(result.highlights) ||
      typeof result.text !== 'string'
    ) {
      throw new Error('Invalid response structure from GPT-4');
    }

    return result;
  } catch (error) {
    console.error('GPT-4 analysis error:', error);

    // Return default values if analysis fails
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
