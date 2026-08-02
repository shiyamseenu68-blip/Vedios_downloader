import { create } from 'zustand';
import type { PlaylistMetadata, PlaylistProgress } from '../types';

interface PlaylistStore {
  // Analysis state
  playlist: PlaylistMetadata | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  
  // Download state
  downloadId: string | null;
  isDownloading: boolean;
  downloadProgress: PlaylistProgress | null;
  downloadError: string | null;
  
  // UI state
  selectedVideos: string[];
  quality: 'best' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p';
  downloadType: 'video' | 'audio';
  darkMode: boolean;
  
  // Actions
  setPlaylist: (playlist: PlaylistMetadata | null) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  setDownloadId: (downloadId: string | null) => void;
  setDownloading: (isDownloading: boolean) => void;
  setDownloadProgress: (progress: PlaylistProgress | null) => void;
  setDownloadError: (error: string | null) => void;
  setSelectedVideos: (videos: string[]) => void;
  setQuality: (quality: 'best' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p') => void;
  setDownloadType: (type: 'video' | 'audio') => void;
  toggleDarkMode: () => void;
  reset: () => void;
}

export const usePlaylistStore = create<PlaylistStore>((set) => ({
  // Initial state
  playlist: null,
  isAnalyzing: false,
  analysisError: null,
  downloadId: null,
  isDownloading: false,
  downloadProgress: null,
  downloadError: null,
  selectedVideos: [],
  quality: '720p',
  downloadType: 'video',
  darkMode: false,
  
  // Actions
  setPlaylist: (playlist) => set({ playlist }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalysisError: (error) => set({ analysisError: error }),
  setDownloadId: (downloadId) => set({ downloadId }),
  setDownloading: (isDownloading) => set({ isDownloading }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
  setDownloadError: (error) => set({ downloadError: error }),
  setSelectedVideos: (videos) => set({ selectedVideos: videos }),
  setQuality: (quality) => set({ quality }),
  setDownloadType: (type) => set({ downloadType: type }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  reset: () => set({
    playlist: null,
    isAnalyzing: false,
    analysisError: null,
    downloadId: null,
    isDownloading: false,
    downloadProgress: null,
    downloadError: null,
    selectedVideos: [],
  }),
}));
