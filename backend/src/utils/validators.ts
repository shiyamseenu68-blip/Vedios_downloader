import { z } from 'zod';

export const analyzeUrlSchema = z.object({
  url: z.string().url().refine(
    (url) => {
      return url.includes('youtube.com') || url.includes('youtu.be');
    },
    { message: 'URL must be a valid YouTube URL' }
  ),
});

export const downloadRequestSchema = z.object({
  url: z.string().url().refine(
    (url) => {
      return url.includes('youtube.com') || url.includes('youtu.be');
    },
    { message: 'URL must be a valid YouTube URL' }
  ),
  quality: z.enum(['best', '1080p', '720p', '480p', '360p', '240p', '144p']),
  type: z.enum(['video', 'audio']),
});

export type AnalyzeUrlInput = z.infer<typeof analyzeUrlSchema>;
export type DownloadRequestInput = z.infer<typeof downloadRequestSchema>;
