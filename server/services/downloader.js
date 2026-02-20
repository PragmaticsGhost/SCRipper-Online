import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOWNLOADS_DIR = path.join(__dirname, '../../downloads');

const ytDlpWrap = new YTDlpWrap();

function isHttpUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .trim()
    .substring(0, 200) || 'download';
}

export async function downloadTrack(url) {
  if (!isHttpUrl(url)) {
    throw new Error('Invalid URL protocol');
  }

  const outputTemplate = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');

  try {
    const info = await ytDlpWrap.getVideoInfo(url);
    const title = info.title || 'Unknown';
    const artist = info.uploader || info.channel || 'Unknown';
    const artworkUrl = info.thumbnail || info.thumbnails?.[info.thumbnails.length - 1]?.url;

    await ytDlpWrap.exec([
      url,
      '--format', 'bestaudio/best',
      '--output', outputTemplate,
      '--no-playlist',
      '--quiet',
      '--no-warnings',
      '--extract-audio',
      '--audio-quality', '0',
    ]);

    const files = await fs.readdir(DOWNLOADS_DIR);
    const sanitizedTitle = sanitizeFilename(title);
    const downloadedFile = files.find(f => {
      const nameWithoutExt = f.substring(0, f.lastIndexOf('.'));
      return nameWithoutExt === sanitizedTitle || f.includes(sanitizedTitle.substring(0, 50));
    });

    if (!downloadedFile) {
      throw new Error('Downloaded file not found');
    }

    const inputPath = path.join(DOWNLOADS_DIR, downloadedFile);
    const mp3Path = path.join(DOWNLOADS_DIR, `${sanitizedTitle}.mp3`);

    return {
      inputPath,
      outputPath: mp3Path,
      title,
      artist,
      artworkUrl,
    };
  } catch (error) {
    console.error('Download error:', error.message);
    throw new Error('Failed to download track');
  }
}

export async function downloadPlaylist(url) {
  if (!isHttpUrl(url)) {
    throw new Error('Invalid URL protocol');
  }

  try {
    const info = await ytDlpWrap.getPlaylistInfo(url);
    const entries = info.entries || [];

    const tracks = [];
    for (const entry of entries) {
      try {
        const entryUrl = entry.url || entry.id;
        if (!isHttpUrl(entryUrl)) continue;
        const track = await downloadTrack(entryUrl);
        tracks.push(track);
      } catch (error) {
        console.error(`Error downloading playlist track: ${error.message}`);
      }
    }

    return tracks;
  } catch (error) {
    console.error('Playlist download error:', error.message);
    throw new Error('Failed to download playlist');
  }
}
