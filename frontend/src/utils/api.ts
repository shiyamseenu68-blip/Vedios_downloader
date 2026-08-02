import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const playlistApi = {
  analyze: (url: string) => 
    api.post<{ success: boolean; data: any }>('/analyze-playlist', { url }),
  
  download: (request: any) => 
    api.post<{ success: boolean; downloadId: string; message: string }>('/download-playlist', request),
  
  getProgress: (downloadId: string) => 
    api.get<{ success: boolean; data: any }>(`/playlist-progress/${downloadId}`),
  
  getFile: (downloadId: string) => 
    api.get(`/playlist-file/${downloadId}`, { responseType: 'blob' }),
  
  cancelDownload: (downloadId: string) => 
    api.delete(`/playlist-download/${downloadId}`),
};

export class SSEClient {
  private eventSource: EventSource | null = null;

  connect(downloadId: string, onMessage: (event: any) => void, onError?: (error: Event) => void) {
    this.disconnect();
    const sseUrl = `${API_BASE_URL}/playlist-events/${downloadId}`;
    
    this.eventSource = new EventSource(sseUrl);
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      if (onError) onError(error);
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
