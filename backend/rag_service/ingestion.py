import os
import json
import time
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional

from config import (
    BOOKS_DIR, MANIFEST_FILE, CHUNK_MIN_TOKENS,
    CHUNK_MAX_TOKENS, CHUNK_OVERLAP_TOKENS
)
from classifier import classify_book_by_filename
from extractor import extract_book_chunks
from embedder import GeminiEmbedder
from vector_store import ChromaVectorStore

class IngestionManager:
    def __init__(
        self,
        books_dir: str = BOOKS_DIR,
        manifest_file: str = MANIFEST_FILE,
        vector_store: Optional[ChromaVectorStore] = None,
        embedder: Optional[GeminiEmbedder] = None
    ):
        self.books_dir = books_dir
        self.manifest_file = manifest_file
        self.vector_store = vector_store or ChromaVectorStore()
        self.embedder = embedder or GeminiEmbedder()
        self.is_ingesting = False
        self.manifest = self._load_manifest()

    def _load_manifest(self) -> Dict[str, Any]:
        """Load persistent ingestion manifest."""
        if os.path.exists(self.manifest_file):
            try:
                with open(self.manifest_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[IngestionManager] Error loading manifest: {e}")
        return {}

    def _save_manifest(self):
        """Save persistent ingestion manifest."""
        try:
            with open(self.manifest_file, 'w', encoding='utf-8') as f:
                json.dump(self.manifest, f, indent=2)
        except Exception as e:
            print(f"[IngestionManager] Error saving manifest: {e}")

    def scan_directory(self) -> List[Dict[str, Any]]:
        """
        Recursively scan the books folder for all .pdf files.
        Classify each book by filename into one of the 4 collections.
        """
        if not os.path.exists(self.books_dir):
            print(f"[IngestionManager] Warning: Books directory '{self.books_dir}' does not exist.")
            return []

        pdf_files = []
        for root, _, files in os.walk(self.books_dir):
            for file in files:
                if file.lower().endswith('.pdf'):
                    full_path = os.path.join(root, file)
                    collection = classify_book_by_filename(file)
                    mtime = os.path.getmtime(full_path)
                    size = os.path.getsize(full_path)
                    pdf_files.append({
                        "filename": file,
                        "path": full_path,
                        "collection": collection,
                        "mtime": mtime,
                        "size_bytes": size
                    })

        return pdf_files

    def check_new_pdfs(self) -> List[Dict[str, Any]]:
        """Identify which scanned PDFs are new or need indexing."""
        all_pdfs = self.scan_directory()
        new_or_updated = []

        for item in all_pdfs:
            fname = item["filename"]
            record = self.manifest.get(fname)
            # If not in manifest or mtime changed or has 0 indexed chunks
            if not record or record.get("mtime") != item["mtime"] or record.get("indexed_chunks", 0) == 0:
                new_or_updated.append(item)

        return new_or_updated

    def ingest_single_book(self, book_info: Dict[str, Any], max_pages: Optional[int] = None):
        """
        Ingest a single textbook:
        1. Extract text using PyMuPDF.
        2. Preserve page numbers.
        3. Split into semantic chunks (500–800 tokens, 100-token overlap).
        4. Generate embeddings using Gemini Embedding 001.
        5. Store embeddings in ChromaDB.
        6. Save metadata: Book name, Chapter, Page number, Chunk ID.
        """
        fname = book_info["filename"]
        fpath = book_info["path"]
        collection = book_info["collection"]

        print(f"\n[IngestionManager] ---> Ingesting: '{fname}'")
        print(f"[IngestionManager] Target Collection: '{collection}' (Pages: {max_pages or 'all'})")

        # Step 1, 2, 3: Extract & Chunk
        t0 = time.time()
        chunks = extract_book_chunks(
            pdf_path=fpath,
            book_name=fname,
            min_tokens=CHUNK_MIN_TOKENS,
            max_tokens=CHUNK_MAX_TOKENS,
            overlap_tokens=CHUNK_OVERLAP_TOKENS,
            max_pages=max_pages
        )
        t_extract = time.time() - t0
        print(f"[IngestionManager] Extracted {len(chunks)} chunks in {t_extract:.2f}s")

        if not chunks:
            print(f"[IngestionManager] No text chunks extracted from '{fname}'.")
            return

        # Step 4 & 5: Embed with Gemini Embedding 001 and store in ChromaDB in batches
        batch_size = 10
        total_indexed = 0

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c["text"] for c in batch]
            ids = [c["metadata"]["chunk_id"] for c in batch]
            metadatas = [c["metadata"] for c in batch]

            try:
                embeddings = self.embedder.embed_texts(texts, batch_size=len(texts))
                self.vector_store.add_chunks(
                    collection_name=collection,
                    chunk_ids=ids,
                    embeddings=embeddings,
                    documents=texts,
                    metadatas=metadatas
                )
                total_indexed += len(batch)
            except Exception as e:
                print(f"[IngestionManager] Batch indexing note: {e}")

        # Step 6: Update manifest
        is_full = max_pages is None
        prev_record = self.manifest.get(fname, {})
        prev_indexed = prev_record.get("indexed_chunks", 0)

        self.manifest[fname] = {
            "collection": collection,
            "mtime": book_info["mtime"],
            "status": "completed" if is_full else "partial",
            "indexed_chunks": max(total_indexed, prev_indexed),
            "pages_processed": max_pages or "all",
            "timestamp": time.time()
        }
        self._save_manifest()
        print(f"[IngestionManager] Completed indexing for '{fname}' ({max(total_indexed, prev_indexed)} chunks in '{collection}').")

    def auto_ingest_on_startup(self, blocking_high_yield_pages: int = 20):
        """
        Automatically run ingestion on server start if new PDFs are detected:
        Phase 1: Index high-yield pages for new books so RAG is operational right away.
        Phase 2: Spawn background thread to index the remaining pages without blocking the server.
        """
        new_pdfs = self.check_new_pdfs()
        if not new_pdfs:
            print("[IngestionManager] All textbooks in folder are verified in ChromaDB.")
            return

        print(f"[IngestionManager] Detected {len(new_pdfs)} textbooks needing indexing in '{self.books_dir}'.")
        for item in new_pdfs:
            print(f"  - {item['filename']} -> Collection: {item['collection']}")

        self.is_ingesting = True

        # Phase 1: High-yield pages first
        print(f"\n[IngestionManager] == Phase 1: High-Yield Indexing (First {blocking_high_yield_pages} pages) ==")
        for item in new_pdfs:
            try:
                self.ingest_single_book(item, max_pages=blocking_high_yield_pages)
            except Exception as e:
                print(f"[IngestionManager] Error during high-yield indexing of '{item['filename']}': {e}")

        print("[IngestionManager] == Phase 1 Complete: High-Yield Medical Collections Ready ==")

        # Phase 2: Background indexing for remaining pages
        def background_full_index():
            print("[IngestionManager] == Phase 2: Starting Gentle Background Ingestion ==")
            for item in new_pdfs:
                try:
                    time.sleep(5)  # Pause before background ingestion
                    self.ingest_single_book(item, max_pages=None)
                except Exception as e:
                    print(f"[IngestionManager] Error in background indexing '{item['filename']}': {e}")
            self.is_ingesting = False
            print("[IngestionManager] == Phase 2 Complete: All Textbooks Fully Ingested ==")

        bg_thread = threading.Thread(target=background_full_index, daemon=True)
        bg_thread.start()

    def get_status(self) -> Dict[str, Any]:
        """Return current status of books and collections."""
        scanned = self.scan_directory()
        vector_stats = self.vector_store.get_stats()
        return {
            "books_dir": self.books_dir,
            "scanned_books_count": len(scanned),
            "books": [
                {
                    "filename": b["filename"],
                    "collection": b["collection"],
                    "status": self.manifest.get(b["filename"], {}).get("status", "unindexed"),
                    "indexed_chunks": self.manifest.get(b["filename"], {}).get("indexed_chunks", 0)
                }
                for b in scanned
            ],
            "is_ingesting": self.is_ingesting,
            "vector_store": vector_stats
        }
