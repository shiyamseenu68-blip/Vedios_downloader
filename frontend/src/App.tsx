import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { usePlaylistStore } from './stores/playlistStore';
import PlaylistAnalysis from './pages/PlaylistAnalysis';
import PlaylistDownload from './pages/PlaylistDownload';

function App() {
  const { darkMode, toggleDarkMode } = usePlaylistStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50'
    }`}>
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Playlist Downloader
          </h1>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full glass hover:glass-dark transition-all duration-300"
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </header>
        
        <main>
          <PlaylistAnalysis />
          <PlaylistDownload />
        </main>
      </div>
      <Toaster position="bottom-right" theme={darkMode ? 'dark' : 'light'} />
    </div>
  );
}

export default App;
