import { Response } from 'express';
import { logger } from '../config/logger';

export interface SSEEvent {
  downloadId: string;
  status: string;
  currentVideo?: string;
  completedVideos: number;
  totalVideos: number;
  percentage: number;
  speed?: string;
  eta?: string;
  zipProgress?: number;
  error?: string;
}

export class SSEManager {
  private clients: Map<string, Response[]> = new Map();

  addClient(downloadId: string, res: Response): void {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (!this.clients.has(downloadId)) {
      this.clients.set(downloadId, []);
    }
    this.clients.get(downloadId)!.push(res);

    logger.debug({ downloadId, clientCount: this.clients.get(downloadId)!.length }, 'SSE client added');

    // Send initial event
    this.sendEvent(downloadId, {
      downloadId,
      status: 'connected',
      completedVideos: 0,
      totalVideos: 0,
      percentage: 0,
    });

    // Cleanup on client disconnect
    res.on('close', () => {
      this.removeClient(downloadId, res);
    });
  }

  removeClient(downloadId: string, res: Response): void {
    const clients = this.clients.get(downloadId);
    if (clients) {
      const index = clients.indexOf(res);
      if (index > -1) {
        clients.splice(index, 1);
        logger.debug({ downloadId, clientCount: clients.length }, 'SSE client removed');
      }
      if (clients.length === 0) {
        this.clients.delete(downloadId);
        logger.debug({ downloadId }, 'All SSE clients removed for download');
      }
    }
  }

  sendEvent(downloadId: string, event: SSEEvent): void {
    const clients = this.clients.get(downloadId);
    if (!clients || clients.length === 0) {
      return;
    }

    const data = `data: ${JSON.stringify(event)}\n\n`;
    const deadClients: Response[] = [];

    for (const client of clients) {
      try {
        client.write(data);
      } catch (error) {
        logger.warn({ downloadId, error }, 'Failed to send SSE event to client');
        deadClients.push(client);
      }
    }

    // Remove dead clients
    for (const deadClient of deadClients) {
      this.removeClient(downloadId, deadClient);
    }
  }

  closeAll(downloadId: string): void {
    const clients = this.clients.get(downloadId);
    if (clients) {
      for (const client of clients) {
        try {
          client.end();
        } catch (error) {
          logger.warn({ downloadId, error }, 'Failed to close SSE client');
        }
      }
      this.clients.delete(downloadId);
      logger.debug({ downloadId }, 'All SSE clients closed');
    }
  }

  getClientCount(downloadId: string): number {
    return this.clients.get(downloadId)?.length || 0;
  }
}

export const sseManager = new SSEManager();
