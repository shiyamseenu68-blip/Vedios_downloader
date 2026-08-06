import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logger } from '../config/logger';
import { AppError } from '../utils/error-handler';
import { VideoMetadata, PlaylistMetadata } from '../types';

const execFileAsync = promisify(execFile);

export class YtDlpService {
  private getYtDlpPath(): string {
    const platform = process.platform;
    let binary = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    
    // Check if binary exists in project root (for production deployments)
    const projectRootPath = path.join(process.cwd(), binary);
    logger.info({ 
      platform, 
      binary, 
      projectRootPath, 
      exists: require('fs').existsSync(projectRootPath) 
    }, 'Resolving yt-dlp path');
    
    if (require('fs').existsSync(projectRootPath)) {
      logger.info({ resolvedPath: projectRootPath }, 'Using yt-dlp from project root');
      return projectRootPath;
    }
    
    // Fallback to default path
    logger.warn({ fallbackPath: binary }, 'Using fallback yt-dlp path');
    return binary;
  }

  async analyzeUrl(url: string): Promise<VideoMetadata | PlaylistMetadata> {
    const ytDlpPath = this.getYtDlpPath();
    const args = this.buildAnalysisArgs(url);

    logger.info({ command: `${ytDlpPath} ${args.join(' ')}` }, 'Analyzing URL');

    try {
      const { stdout, stderr } = await execFileAsync(ytDlpPath, args);
      
      if (stderr) {
        logger.warn({ stderr }, 'yt-dlp stderr output');
      }

      const data = JSON.parse(stdout);
      
      if (data._type === 'playlist') {
        return this.parsePlaylistMetadata(data);
      }
      
      return this.parseVideoMetadata(data);
    } catch (error: any) {
      logger.error({
        command: `${ytDlpPath} ${args.join(' ')}`,
        stdout: error.stdout,
        stderr: error.stderr,
        exitCode: error.code,
        error: error.message,
      }, 'yt-dlp analysis failed');

      throw new AppError(
        'ANALYSIS_FAILED',
        'Failed to analyze URL',
        {
          command: `${ytDlpPath} ${args.join(' ')}`,
          stdout: error.stdout,
          stderr: error.stderr,
          exitCode: error.code,
        }
      );
    }
  }

  private buildAnalysisArgs(url: string): string[] {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=android',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    // Add cookies if file exists
    const cookiePath = this.getCookiePath();
    if (cookiePath) {
      args.push('--cookies', cookiePath);
    }

    args.push(url);
    return args;
  }

  private getCookiePath(): string | null {
    const cookiePath = process.env.YOUTUBE_COOKIES_FILE;
    if (cookiePath && require('fs').existsSync(cookiePath)) {
      logger.info({ cookiePath }, 'Using YouTube cookies file');
      return cookiePath;
    }
    return null;
  }

  private parseVideoMetadata(data: any): VideoMetadata {
    return {
      id: data.id,
      title: data.title,
      uploader: data.uploader || data.channel,
      duration: data.duration,
      thumbnail: data.thumbnail,
      url: data.url,
      webpage_url: data.webpage_url,
      view_count: data.view_count,
      upload_date: data.upload_date,
    };
  }

  private parsePlaylistMetadata(data: any): PlaylistMetadata {
    return {
      id: data.id,
      title: data.title,
      uploader: data.uploader || data.channel,
      video_count: data.entry_count,
      thumbnail: data.thumbnails?.[0]?.url || data.thumbnail,
      url: data.webpage_url,
      videos: [],
    };
  }

  async getVersion(): Promise<string> {
    const ytDlpPath = this.getYtDlpPath();
    try {
      const { stdout } = await execFileAsync(ytDlpPath, ['--version']);
      return stdout.trim();
    } catch (error) {
      logger.error({ error }, 'Failed to get yt-dlp version');
      throw new AppError('YTDLP_NOT_FOUND', 'yt-dlp binary not found or not executable');
    }
  }

  private async executeWithAbort(
    command: string,
    args: string[],
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    logger.info({ command, args: args.join(' ') }, 'executeWithAbort: About to spawn process');

    // Add ffmpeg-static to PATH for yt-dlp subprocess
    const ffmpegPath = require('ffmpeg-static');
    const ffmpegDir = ffmpegPath ? path.dirname(ffmpegPath) : '/usr/bin';
    
    // Add Node.js and Python to PATH for JavaScript runtime
    const nodeDir = process.execPath ? path.dirname(process.execPath) : '/usr/bin';
    const pythonDir = '/usr/bin';
    
    const env = { 
      ...process.env, 
      PATH: `${ffmpegDir}${path.delimiter}${nodeDir}${path.delimiter}${pythonDir}${path.delimiter}${process.env.PATH}` 
    };

    return new Promise((resolve, reject) => {
      logger.info({ command, args: args.join(' ') }, 'executeWithAbort: Spawning process now');
      const process = spawn(command, args, { env });
      let stdout = '';
      let stderr = '';
      let isResolved = false;

      const abortHandler = () => {
        if (isResolved) return;
        isResolved = true;

        cleanup();
        reject(new Error('Playlist analysis timed out'));
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        process.stdout.removeAllListeners();
        process.stderr.removeAllListeners();
        process.removeAllListeners('close');
        process.removeAllListeners('error');
        controller.signal.removeEventListener('abort', abortHandler);
        if (!process.killed) process.kill();
      };

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (isResolved) return;
        isResolved = true;

        cleanup();

        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      process.on('error', (error) => {
        if (isResolved) return;
        isResolved = true;

        cleanup();
        reject(error);
      });

      controller.signal.addEventListener('abort', abortHandler);
    });
  }

  async analyzePlaylist(url: string): Promise<PlaylistMetadata> {
    const ytDlpPath = this.getYtDlpPath();
    const startTime = Date.now();

    logger.info({ url }, 'Starting playlist analysis');

    try {
      // Get video list with playlist metadata (limited to 20)
      const videoArgs = [
        '--dump-json',
        '--flat-playlist',
        '--playlist-end', '20',
        '--extractor-args', 'youtube:player_client=android',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ];

      // Add cookies if file exists
      const cookiePath = this.getCookiePath();
      if (cookiePath) {
        videoArgs.push('--cookies', cookiePath);
      }

      videoArgs.push(url);
      logger.info({ command: `${ytDlpPath} ${videoArgs.join(' ')}` }, 'Video extraction started');

      const videoStartTime = Date.now();
      const { stdout: videoStdout } = await this.executeWithAbort(ytDlpPath, videoArgs, 60000);
      const videoDuration = Date.now() - videoStartTime;

      logger.info({ durationMs: videoDuration }, 'Video extraction completed');

      const lines = videoStdout.trim().split('\n');
      const videos: VideoMetadata[] = [];
      let playlistMetadata: any = null;

      for (const line of lines) {
        if (line.trim() && videos.length < 20) {
          try {
            const data = JSON.parse(line);
            if (!playlistMetadata) {
              playlistMetadata = data;
            }
            videos.push(this.parseVideoMetadata(data));
          } catch (e) {
            logger.warn({ line, error: e }, 'Failed to parse playlist entry');
          }
        }
      }

      const totalDuration = Date.now() - startTime;

      logger.info({ 
        videoCount: videos.length,
        totalDurationMs: totalDuration,
        videoDurationMs: videoDuration
      }, 'Playlist analysis completed');

      return {
        id: playlistMetadata?.playlist_id || '',
        title: playlistMetadata?.playlist_title || '',
        uploader: playlistMetadata?.playlist_uploader || playlistMetadata?.playlist_channel || '',
        video_count: videos.length,
        thumbnail: '',
        url: playlistMetadata?.playlist_webpage_url || url,
        videos,
      };
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      logger.error({
        url,
        error: error.message,
        totalDurationMs: totalDuration,
      }, 'Playlist analysis failed');

      if (error.message === 'Playlist analysis timed out') {
        throw new AppError('PLAYLIST_TIMEOUT', 'Playlist analysis timed out');
      }

      throw new AppError(
        'PLAYLIST_ANALYSIS_FAILED',
        'Failed to analyze playlist',
        { error: error.message }
      );
    }
  }
}
