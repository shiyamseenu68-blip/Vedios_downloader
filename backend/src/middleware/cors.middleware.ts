import cors from 'cors';
import { config } from '../config';

export const corsMiddleware = cors({
  origin: config.isDevelopment ? '*' : process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
});
