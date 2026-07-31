export const QUALITY_FORMATS: Record<string, string> = {
  best: 'bestvideo+bestaudio/best',
  '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
  '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
  '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
  '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
  '240p': 'bestvideo[height<=240]+bestaudio/best[height<=240]',
  '144p': 'bestvideo[height<=144]+bestaudio/best[height<=144]',
};

export const DOWNLOAD_DIR = 'downloads';
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const FILE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
export const MAX_CONCURRENT_DOWNLOADS = 3;
export const MAX_GLOBAL_DOWNLOADS = 10;
