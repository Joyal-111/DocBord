import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend .env if exists
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)

CHROMA_PERSIST_DIR = str(DATA_DIR / 'chroma_db')
MANIFEST_FILE = str(DATA_DIR / 'ingestion_manifest.json')

# Textbook directory as specified in requirements
BOOKS_DIR = os.getenv('BOOKS_DIR', r'C:\Users\hp\Desktop\projects\books')

# ChromaDB Collections
COLLECTIONS = ['anatomy', 'physiology', 'pathology', 'pharmacology']

# Gemini Models
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
EMBEDDING_MODEL = 'gemini-embedding-001'
PRIMARY_LLM_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
FALLBACK_LLM_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-flash-lite-latest',
    'gemini-2.5-pro'
]

# Chunking specifications (500–800 tokens, 100-token overlap)
CHUNK_MIN_TOKENS = 500
CHUNK_MAX_TOKENS = 800
CHUNK_OVERLAP_TOKENS = 100

# Service Port
PORT = int(os.getenv('RAG_PORT', '5001'))
HOST = os.getenv('RAG_HOST', '127.0.0.1')
