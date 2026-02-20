import NodeID3 from 'node-id3';
import axios from 'axios';

function isSafeUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '::1') return false;
    if (/^127\./.test(hostname)) return false;
    if (/^10\./.test(hostname)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    if (/^192\.168\./.test(hostname)) return false;
    if (/^169\.254\./.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function embedMetadata(mp3Path, title, artist, artworkUrl) {
  try {
    let artwork = null;

    if (artworkUrl && isSafeUrl(artworkUrl)) {
      try {
        const response = await axios.get(artworkUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          maxRedirects: 3,
          maxContentLength: 10 * 1024 * 1024,
        });
        artwork = response.data;
      } catch (error) {
        console.warn('Failed to download artwork:', error.message);
      }
    }

    const tags = {
      title: title || 'Unknown',
      artist: artist || 'Unknown',
      album: 'SoundCloud',
      image: artwork ? {
        mime: 'image/jpeg',
        type: { id: 3, name: 'Front Cover' },
        description: 'Cover',
        imageBuffer: artwork,
      } : undefined,
    };

    NodeID3.write(tags, mp3Path);

    return true;
  } catch (error) {
    console.error('Metadata embedding error:', error.message);
    throw new Error('Failed to embed metadata');
  }
}
