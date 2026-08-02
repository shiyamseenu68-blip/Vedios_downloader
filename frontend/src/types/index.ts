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

export interface PlaylistProgress {
  downloadId: string;
  status: 'analyzing' | 'downloading' | 'zipping' | 'completed' | 'cancelled' | 'error';
  totalVideos: number;
  completedVideos: number;
  currentVideoIndex: number;
  currentVideoId: string;
  currentVideoTitle: string;
  percentage: number;
  speed?: string;
  eta?: string;
  zipProgress?: number;
  error?: string;
}

export interface PlaylistDownloadRequest {
  url: string;
  quality: 'best' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p';
  type: 'video' | 'audio';
  videoIds?: string[];
}

export interface PlaylistDownloadResponse {
  success: boolean;
  downloadId: string;
  message: string;
}

export interface SSEEvent {
  downloadId: string;
  status: string;
  currentVideo?: string;
  completedVideos?: number;
  totalVideos?: number;
  percentage?: number;
  speed?: string;
  eta?: string;
  zipProgress?: number;
  error?: string;
}
