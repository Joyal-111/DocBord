import sys
import os
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import PORT, HOST, BOOKS_DIR
from vector_store import ChromaVectorStore
from embedder import GeminiEmbedder
from ingestion import IngestionManager
from retriever import MedicalRetriever
from generator import NotesGenerator

# Ensure utf-8 output in Windows console
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Global components
vector_store = ChromaVectorStore()
embedder = GeminiEmbedder()
ingestion_mgr = IngestionManager(
    books_dir=BOOKS_DIR,
    vector_store=vector_store,
    embedder=embedder
)
retriever = MedicalRetriever(
    vector_store=vector_store,
    embedder=embedder
)
generator = NotesGenerator()

import threading

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("  [DocBord Hybrid RAG Medical Learning System Starting]")
    print(f"  Scanning Textbook Directory: {BOOKS_DIR}")
    print("=" * 60)

    # Automatically scan textbook directory and run ingestion asynchronously
    try:
        t = threading.Thread(
            target=ingestion_mgr.auto_ingest_on_startup,
            kwargs={"blocking_high_yield_pages": 20},
            daemon=True
        )
        t.start()
    except Exception as e:
        print(f"[DocBord RAG Server] Startup ingestion launch error: {e}")

    yield

    print("[DocBord RAG Server] Shutting down...")

app = FastAPI(
    title="DocBord Hybrid RAG Medical Learning Engine",
    description="Local ChromaDB + Gemini Embedding 001 + Gemini 2.5 Flash for MBBS Medical Education",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, Any]]] = None

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5

@app.get("/health")
def health_check():
    status = ingestion_mgr.get_status()
    return {
        "status": "ok",
        "service": "DocBord Hybrid RAG Medical Learning Engine",
        "vector_collections": status["vector_store"]["collections"],
        "total_documents": status["vector_store"]["total_documents"],
        "scanned_books": status["books"],
        "is_ingesting": status["is_ingesting"]
    }

@app.post("/api/rag/search")
def search_textbooks(req: SearchRequest):
    """Debug/Inspection endpoint to view raw Top K retrieved textbook chunks."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    corrected_query, entity, chunks = retriever.retrieve_top_chunks(
        query=req.query,
        top_k=req.top_k or 5
    )

    return {
        "original_query": req.query,
        "corrected_query": corrected_query,
        "medical_entity": entity,
        "chunks_count": len(chunks),
        "chunks": chunks
    }

@app.post("/api/rag/query")
def process_query(req: QueryRequest):
    """
    Main Retrieval-Augmented Generation Pipeline:
    User Question
    → Correct spelling
    → Detect medical entity
    → Search ChromaDB
    → Retrieve Top 5 chunks
    → Send retrieved context to Gemini 2.5 Flash
    → Generate student-friendly notes
    → Return citations with textbook name and page number
    """
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    user_query = req.message.strip()

    # Step 1, 2, 3, 4: Spelling -> Entity -> ChromaDB Search -> Top 5 chunks
    corrected_query, entity, top_chunks = retriever.retrieve_top_chunks(
        query=user_query,
        top_k=5
    )

    # Step 5, 6, 7: Send context to Gemini -> Generate MBBS notes with citations & Mermaid
    result = generator.generate_notes(
        query=corrected_query,
        entity=entity,
        retrieved_chunks=top_chunks,
        history=req.history
    )

    return {
        "type": "text",
        "content": result["content"],
        "notes": result.get("notes"),
        "entity": entity,
        "citations": result.get("citations"),
        "model": result.get("model"),
        "chunks_used": result.get("chunks_used"),
        "source": "Textbook RAG (" + (top_chunks[0]["metadata"].get("book_name", "Textbooks") if top_chunks else "Textbooks") + ")"
    }

@app.post("/api/rag/ingest")
def trigger_ingest():
    """Manually trigger scanning and ingestion."""
    new_pdfs = ingestion_mgr.check_new_pdfs()
    if not new_pdfs:
        return {"message": "All textbooks are already indexed in ChromaDB."}
    
    ingestion_mgr.auto_ingest_on_startup(blocking_high_yield_pages=40)
    return {"message": f"Started ingestion for {len(new_pdfs)} textbooks."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False)
