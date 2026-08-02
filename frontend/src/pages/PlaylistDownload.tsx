import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Play, X, Loader2, Zap, Clock } from 'lucide-react';
import { usePlaylistStore } from '../stores/playlistStore';
import { playlistApi, SSEClient } from '../utils/api';
import { toast } from 'sonner';

export default function PlaylistDownload() {
  const {
    playlist,
    selectedVideos,
    quality,
    downloadType,
    downloadId,
    isDownloading,
    downloadProgress,
    setDownloadId,
    setDownloading,
    setDownloadProgress,
    setDownloadError,
    setQuality,
    setDownloadType,
  } = usePlaylistStore();

  const [sseClient] = useState(() => new SSEClient());

  useEffect(() => {
    return () => {
      sseClient.disconnect();
    };
  }, [sseClient]);

  const handleDownload = async () => {
    if (!playlist || selectedVideos.length === 0) {
      toast.error('Please select videos to download');
      return;
    }

    setDownloading(true);
    setDownloadError(null);

    const requestBody = {
      url: playlist.url,
      quality,
      type: downloadType,
      videoIds: selectedVideos,
    };

    try {
      const response = await playlistApi.download(requestBody);

      if (response.data.success) {
        setDownloadId(response.data.downloadId);
        toast.success('Download started');

        // Connect to SSE
        sseClient.connect(
          response.data.downloadId,
          (event) => {
            setDownloadProgress(event);
            if (event.status === 'completed') {
              toast.success('Download completed!');
              setDownloading(false);
            } else if (event.status === 'error') {
              toast.error(event.error || 'Download failed');
              setDownloading(false);
            }
          },
          (error) => {
            console.error('SSE error:', error);
          }
        );
      }
    } catch (error: any) {
      console.error('Download error:', error);
      setDownloadError(error.response?.data?.error?.message || 'Failed to start download');
      toast.error('Failed to start download');
      setDownloading(false);
    }
  };

  const handleCancel = async () => {
    if (downloadId) {
      try {
        await playlistApi.cancelDownload(downloadId);
        sseClient.disconnect();
        setDownloadId(null);
        setDownloading(false);
        setDownloadProgress(null);
        toast.success('Download cancelled');
      } catch (error) {
        toast.error('Failed to cancel download');
      }
    }
  };

  const handleDownloadZip = async () => {
    console.log('=== DOWNLOAD ZIP CLICKED ===');
    console.log('downloadId:', downloadId);
    
    if (!downloadId) {
      console.log('ERROR: No downloadId');
      return;
    }

    try {
      console.log('Calling playlistApi.getFile with downloadId:', downloadId);
      const response = await playlistApi.getFile(downloadId);
      console.log('Response received:', response);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response data type:', typeof response.data);
      console.log('Response data size:', response.data?.size || 'unknown');
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      console.log('Blob URL created:', url);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'playlist.zip');
      document.body.appendChild(link);
      console.log('Link element created and appended');
      
      link.click();
      console.log('Link clicked');
      
      link.remove();
      console.log('Link removed');
      
      window.URL.revokeObjectURL(url);
      console.log('Blob URL revoked');
      
      toast.success('ZIP file downloaded');
      console.log('=== DOWNLOAD ZIP SUCCESS ===');
    } catch (error) {
      console.log('=== DOWNLOAD ZIP ERROR ===');
      console.log('Error:', error);
      console.log('Error response:', error.response);
      console.log('Error message:', error.message);
      console.log('========================');
      toast.error('Failed to download ZIP file');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-2xl p-6"
    >
      <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Download Settings
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as any)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="best">Best</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
            <option value="360p">360p</option>
            <option value="240p">240p</option>
            <option value="144p">144p</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <select
            value={downloadType}
            onChange={(e) => setDownloadType(e.target.value as any)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </div>

      {!isDownloading && !downloadProgress && (
        <div className="space-y-4">
          <button
            onClick={handleDownload}
            disabled={!playlist || selectedVideos.length === 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Start Download ({selectedVideos.length} videos)
          </button>
          
          {/* Debug button */}
          <button
            onClick={() => {
              console.log('=== DEBUG STATE ===');
              console.log('playlist:', playlist);
              console.log('selectedVideos:', selectedVideos);
              console.log('selectedVideos.length:', selectedVideos.length);
              console.log('isDownloading:', isDownloading);
              console.log('downloadProgress:', downloadProgress);
              console.log('Button disabled condition:', !playlist || selectedVideos.length === 0);
              console.log('===================');
            }}
            className="w-full px-4 py-2 bg-gray-500/20 text-gray-500 rounded-xl text-sm"
          >
            Debug State
          </button>
          
          {/* API Test button */}
          <button
            onClick={async () => {
              console.log('=== API CONNECTIVITY TEST ===');
              try {
                const response = await fetch('http://localhost:10000/api/analyze-playlist', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: 'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI' })
                });
                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);
              } catch (error) {
                console.error('API Test Error:', error);
              }
              console.log('============================');
            }}
            className="w-full px-4 py-2 bg-blue-500/20 text-blue-500 rounded-xl text-sm"
          >
            Test API Connectivity
          </button>
        </div>
      )}

      {(isDownloading || downloadProgress) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="p-4 bg-white/10 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Download Progress</span>
              <span className="text-sm opacity-70">
                {downloadProgress?.completedVideos || 0} / {downloadProgress?.totalVideos || 0}
              </span>
            </div>

            <div className="w-full bg-white/20 rounded-full h-3 mb-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${downloadProgress?.percentage || 0}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
              />
            </div>

            {downloadProgress && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  <span className="truncate">{downloadProgress.currentVideoTitle}</span>
                </div>

                {downloadProgress.speed && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>{downloadProgress.speed}</span>
                  </div>
                )}

                {downloadProgress.eta && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>ETA: {downloadProgress.eta}</span>
                  </div>
                )}

                {downloadProgress.zipProgress !== undefined && downloadProgress.zipProgress > 0 && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating ZIP: {downloadProgress.zipProgress}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {downloadProgress?.status === 'completed' && (
              <button
                onClick={handleDownloadZip}
                className="flex-1 px-4 py-3 bg-green-500/20 text-green-500 rounded-xl font-semibold hover:bg-green-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download ZIP
              </button>
            )}

            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-3 bg-red-500/20 text-red-500 rounded-xl font-semibold hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
