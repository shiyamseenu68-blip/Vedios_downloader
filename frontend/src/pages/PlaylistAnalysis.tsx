import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { usePlaylistStore } from '../stores/playlistStore';
import { playlistApi } from '../utils/api';
import { toast } from 'sonner';

export default function PlaylistAnalysis() {
  const [url, setUrl] = useState('');
  const { 
    playlist, 
    isAnalyzing, 
    analysisError, 
    setPlaylist, 
    setAnalyzing, 
    setAnalysisError,
    selectedVideos,
    setSelectedVideos 
  } = usePlaylistStore();

  const handleAnalyze = async () => {
    if (!url) {
      toast.error('Please enter a playlist URL');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setPlaylist(null);
    setSelectedVideos([]);

    try {
      const response = await playlistApi.analyze(url);
      if (response.data.success) {
        setPlaylist(response.data.data);
        setSelectedVideos(response.data.data.videos.map((v: any) => v.id));
        toast.success('Playlist analyzed successfully');
      }
    } catch (error: any) {
      setAnalysisError(error.response?.data?.error?.message || 'Failed to analyze playlist');
      toast.error('Failed to analyze playlist');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos(
      selectedVideos.includes(videoId)
        ? selectedVideos.filter(id => id !== videoId)
        : [...selectedVideos, videoId]
    );
  };

  const selectAll = () => {
    if (playlist) {
      setSelectedVideos(playlist.videos.map(v => v.id));
    }
  };

  const deselectAll = () => {
    setSelectedVideos([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-2xl p-6 mb-6"
    >
      <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Analyze Playlist
      </h2>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter YouTube playlist URL..."
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
        />
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {analysisError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-2"
        >
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-500">{analysisError}</span>
        </motion.div>
      )}

      {playlist && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-4 p-4 bg-white/10 rounded-xl">
            <h3 className="font-semibold text-lg mb-2">{playlist.title}</h3>
            <p className="text-sm opacity-70">
              {playlist.uploader} • {playlist.video_count} videos
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-all"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-all"
            >
              Deselect All
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {playlist.videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  selectedVideos.includes(video.id)
                    ? 'bg-blue-500/20 border border-blue-500/50'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
                onClick={() => toggleVideoSelection(video.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedVideos.includes(video.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-white/30'
                  }`}>
                    {selectedVideos.includes(video.id) && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{video.title}</p>
                    <p className="text-sm opacity-70">{video.uploader}</p>
                  </div>
                  <span className="text-sm opacity-70">
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 text-sm opacity-70">
            {selectedVideos.length} of {playlist.video_count} videos selected
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
