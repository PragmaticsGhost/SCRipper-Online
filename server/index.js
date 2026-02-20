import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadTrack, downloadPlaylist } from './services/downloader.js';
import { convertToMp3 } from './services/converter.js';
import { embedMetadata } from './services/metadata.js';
import { login, requireAuth } from './middleware/auth.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS restricted to configured origin(s)
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Download rate limit exceeded, please try again later' },
});

// Downloads directory (resolved to absolute for safe path comparisons)
const DOWNLOADS_DIR = path.resolve(path.join(__dirname, '../downloads'));
if (!existsSync(DOWNLOADS_DIR)) {
  await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
}

function isValidSoundCloudUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const validHosts = ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'];
    return ['http:', 'https:'].includes(parsed.protocol) && validHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

// Path traversal prevention: strip directory components and verify containment
function resolveDownloadPath(filename) {
  const base = path.basename(filename);
  if (!base || base === '.' || base === '..') return null;
  const resolved = path.resolve(path.join(DOWNLOADS_DIR, base));
  if (!resolved.startsWith(DOWNLOADS_DIR + path.sep)) return null;
  return { filePath: resolved, safeName: base };
}

// --- Routes ---

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/login', loginLimiter, login);

app.post('/api/download', requireAuth, downloadLimiter, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidSoundCloudUrl(url)) {
      return res.status(400).json({ error: 'Only SoundCloud URLs are supported' });
    }

    const isPlaylist = url.includes('/sets/');
    const tracks = isPlaylist
      ? await downloadPlaylist(url)
      : [await downloadTrack(url)];

    const results = [];
    for (const track of tracks) {
      try {
        const mp3Path = await convertToMp3(track.inputPath, track.outputPath);
        await embedMetadata(mp3Path, track.title, track.artist, track.artworkUrl);

        results.push({
          success: true,
          title: track.title,
          artist: track.artist,
          filename: path.basename(mp3Path),
        });
      } catch (err) {
        console.error(`Error processing track ${track.title}:`, err.message);
        results.push({
          success: false,
          title: track.title || 'Unknown',
          error: 'Failed to process track',
        });
      }
    }

    res.json({ success: true, total: tracks.length, results });
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'Download failed. Please check the URL and try again.' });
  }
});

app.get('/api/downloads', requireAuth, async (_req, res) => {
  try {
    const files = await fs.readdir(DOWNLOADS_DIR);
    const mp3Files = files
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .map(f => ({ filename: f }));

    res.json({ files: mp3Files });
  } catch (err) {
    console.error('Error listing downloads:', err.message);
    res.status(500).json({ error: 'Failed to list downloads' });
  }
});

app.get('/api/downloads/:filename', requireAuth, (req, res) => {
  const result = resolveDownloadPath(req.params.filename);
  if (!result) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!existsSync(result.filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(result.filePath, result.safeName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed to download file' });
    }
  });
});

app.delete('/api/downloads/:filename', requireAuth, async (req, res) => {
  try {
    const result = resolveDownloadPath(req.params.filename);
    if (!result) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    if (!existsSync(result.filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    await fs.unlink(result.filePath);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(PORT, () => {
  console.log(`SCRipper API running on port ${PORT}`);
});
