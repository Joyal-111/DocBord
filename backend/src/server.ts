import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat.route.js';
import { ragClientService } from './providers/rag-client.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Main API routes
app.use('/api', chatRouter);

app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to DocBord Medical AI Backend API',
    endpoints: {
      health: '/api/health',
      chat: 'POST /api/chat'
    }
  });
});

app.listen(PORT, async () => {
  console.log(`[DocBord Backend] Server running on http://localhost:${PORT}`);
  // Automatically start and scan textbooks via Python Hybrid RAG Engine
  try {
    await ragClientService.startServerIfNeeded();
  } catch (err: any) {
    console.warn('[DocBord Backend] Error during RAG service startup:', err?.message);
  }
});

// Process cleanup
process.on('SIGINT', () => {
  ragClientService.stopServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  ragClientService.stopServer();
  process.exit(0);
});

