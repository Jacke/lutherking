/**
 * Audio Conversion Utilities
 *
 * Provides functions to convert audio files between different formats
 * for compatibility with various transcription services.
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

// Set ffmpeg path from the installed package
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Converts an audio file to PCM 16kHz mono format
 *
 * This format is required by ElevenLabs Scribe v2 API.
 *
 * @param inputPath - Path to the input audio file (WebM, WAV, MP3, etc.)
 * @returns Promise that resolves to the path of the converted PCM file
 * @throws Error if conversion fails
 */
export async function convertToPCM(inputPath: string): Promise<string> {
  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // Generate output path (same directory, .pcm extension)
  const parsedPath = path.parse(inputPath);
  const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.pcm`);

  // If PCM file already exists, return it (avoid re-conversion)
  if (fs.existsSync(outputPath)) {
    console.log(`[Converter] PCM file already exists, skipping conversion: ${outputPath}`);
    return outputPath;
  }

  console.log(`[Converter] Converting ${inputPath} to PCM 16kHz mono...`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(16000)  // 16kHz sample rate (required by Scribe)
      .audioChannels(1)        // Mono (single channel)
      .format('s16le')         // Signed 16-bit little-endian PCM
      .on('start', (commandLine) => {
        console.log(`[Converter] FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[Converter] Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`[Converter] Conversion complete: ${outputPath}`);

        // Verify output file was created
        if (!fs.existsSync(outputPath)) {
          reject(new Error('Conversion completed but output file not found'));
          return;
        }

        const stats = fs.statSync(outputPath);
        console.log(`[Converter] Output file size: ${stats.size} bytes`);

        resolve(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[Converter] FFmpeg error:', err.message);
        console.error('[Converter] FFmpeg stderr:', stderr);
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Deletes a temporary PCM file
 *
 * Used to clean up converted files after transcription to save storage space.
 *
 * @param pcmPath - Path to the PCM file to delete
 */
export function cleanupPCMFile(pcmPath: string): void {
  try {
    if (fs.existsSync(pcmPath) && pcmPath.endsWith('.pcm')) {
      fs.unlinkSync(pcmPath);
      console.log(`[Converter] Cleaned up temporary PCM file: ${pcmPath}`);
    }
  } catch (err) {
    console.error(`[Converter] Failed to cleanup PCM file ${pcmPath}:`, err);
    // Non-fatal error - don't throw
  }
}

/**
 * Gets the expected PCM file path for a given input file
 *
 * @param inputPath - Path to the input audio file
 * @returns The path where the PCM file would be created
 */
export function getPCMPath(inputPath: string): string {
  const parsedPath = path.parse(inputPath);
  return path.join(parsedPath.dir, `${parsedPath.name}.pcm`);
}
