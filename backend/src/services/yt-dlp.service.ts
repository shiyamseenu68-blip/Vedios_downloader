import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logger } from '../config/logger';
import { AppError } from '../utils/error-handler';
import { VideoMetadata, PlaylistMetadata } from '../types';

const execFileAsync = promisify(execFile);

export class YtDlpService {
  private getYtDlpPath(): string {
    const platform = process.platform;
    const binary = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    return path.join(process.cwd(), binary);
  }

  async analyzeUrl(url: string): Promise<VideoMetadata | PlaylistMetadata> {
    const ytDlpPath = this.getYtDlpPath();
    const args = ['--dump-json', '--no-playlist', url];

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
}
