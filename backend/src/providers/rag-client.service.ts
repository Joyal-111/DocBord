import { spawn, ChildProcess } from 'child_process';
import path from 'path';

export interface RagResponse {
  type: string;
  content: string;
  notes?: any;
  entity?: string;
  citations?: string;
  model?: string;
  chunks_used?: number;
  source?: string;
}

export class RagClientService {
  private pythonProcess: ChildProcess | null = null;
  private ragBaseUrl: string = process.env.RAG_URL || 'http://127.0.0.1:5001';
  private isStarting = false;

  constructor() {}

  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.ragBaseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async startServerIfNeeded(): Promise<void> {
    const isAlive = await this.checkHealth();
    if (isAlive) {
      console.log(`[DocBord Backend] Python RAG Engine is already running at ${this.ragBaseUrl}`);
      return;
    }

    if (this.isStarting) {
      return;
    }
    this.isStarting = true;

    console.log('[DocBord Backend] Launching Python Hybrid RAG Medical Learning Engine...');
    const pythonScript = path.resolve(__dirname, '../../rag_service/server.py');

    // Launch python server
    this.pythonProcess = spawn('python', [pythonScript], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    this.pythonProcess.stdout?.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`[RAG Engine] ${line.trim()}`);
        }
      }
    });

    this.pythonProcess.stderr?.on('data', (data) => {
      const str = data.toString().trim();
      if (str && !str.includes('DeprecationWarning')) {
        console.warn(`[RAG Engine Error] ${str}`);
      }
    });

    this.pythonProcess.on('exit', (code) => {
      console.log(`[DocBord Backend] Python RAG Engine process exited with code ${code}`);
      this.pythonProcess = null;
      this.isStarting = false;
    });

    // Wait for health endpoint
    console.log('[DocBord Backend] Waiting for Python RAG Engine to initialize and scan textbooks...');
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const healthy = await this.checkHealth();
      if (healthy) {
        console.log('[DocBord Backend] Python RAG Engine is healthy and ready!');
        this.isStarting = false;
        return;
      }
    }

    this.isStarting = false;
    console.warn('[DocBord Backend] Python RAG Engine took longer than expected to report healthy.');
  }

  async queryRag(message: string, history?: any[]): Promise<RagResponse> {
    // Ensure service is running
    const alive = await this.checkHealth();
    if (!alive) {
      await this.startServerIfNeeded();
    }

    const res = await fetch(`${this.ragBaseUrl}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`RAG engine returned HTTP ${res.status}: ${errText}`);
    }

    return await res.json() as RagResponse;
  }

  stopServer() {
    if (this.pythonProcess) {
      console.log('[DocBord Backend] Stopping Python RAG Engine...');
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }
}

export const ragClientService = new RagClientService();
