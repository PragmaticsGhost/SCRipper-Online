import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';

export async function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    if (!existsSync(inputPath)) {
      return reject(new Error(`Input file not found: ${inputPath}`));
    }

    // Remove output file if it exists
    if (existsSync(outputPath)) {
      fs.unlink(outputPath).catch(() => {});
    }

    ffmpeg(inputPath)
      .audioBitrate(320)
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('end', async () => {
        // Clean up original file
        try {
          if (inputPath !== outputPath && existsSync(inputPath)) {
            await fs.unlink(inputPath);
          }
        } catch (error) {
          console.warn('Failed to delete original file:', error);
        }
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
      })
      .save(outputPath);
  });
}
