import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { db } from '../../../drizzle/db';
import { sessions } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Disable body parser to handle FormData manually
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = new IncomingForm({
      uploadDir: path.join(process.cwd(), 'storage', 'sessions'),
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB max
    });

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'storage', 'sessions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Extract sessionId and audio file
    const sessionId = Array.isArray(fields.sessionId) ? fields.sessionId[0] : fields.sessionId;
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;

    if (!sessionId || !audioFile) {
      return res.status(400).json({ error: 'Missing sessionId or audio file' });
    }

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .get();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Rename file to sessionId.webm (or .wav after conversion)
    const originalPath = (audioFile as File).filepath;
    const extension = path.extname((audioFile as File).originalFilename || '.webm');
    const newPath = path.join(uploadDir, `${sessionId}${extension}`);

    // Move file to final location
    fs.renameSync(originalPath, newPath);

    // Update session with file path
    await db
      .update(sessions)
      .set({ wavPath: newPath })
      .where(eq(sessions.id, session.id))
      .run();

    console.log(`Audio uploaded successfully: ${newPath}`);

    return res.status(200).json({
      success: true,
      path: newPath,
      sessionId,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to upload audio',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
