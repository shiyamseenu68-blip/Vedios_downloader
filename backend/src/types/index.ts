export interface VideoMetadata {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
  url: string;
  webpage_url: string;
  view_count?: number;
  upload_date?: string;
}

export interface PlaylistMetadata {
  id: string;
  title: string;
  uploader: string;
  video_count: number;
  thumbnail: string;
  url: string;
  videos: VideoMetadata[];
}

export type AnalysisResult = VideoMetadata | PlaylistMetadata;

export interface DownloadProgress {
  downloadId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed?: string;
  eta?: string;
  fileSize?: string;
  error?: string;
  filePath?: string;
}

export type QualityOption = 'best' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p';

export interface DownloadRequest {
  url: string;
  quality: QualityOption;
  type: 'video' | 'audio';
}

export interface DownloadResponse {
  downloadId: string;
  status: string;
  message: string;
}
