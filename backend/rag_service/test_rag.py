import os
import sys
from pathlib import Path

# Add directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import BOOKS_DIR
from ingestion import IngestionManager
from vector_store import ChromaVectorStore
from embedder import GeminiEmbedder
from retriever import MedicalRetriever
from generator import NotesGenerator

def test_system():
    print("Testing Ingestion and Retrieval...")
    vstore = ChromaVectorStore()
    embedder = GeminiEmbedder()
    mgr = IngestionManager(books_dir=BOOKS_DIR, vector_store=vstore, embedder=embedder)

    scanned = mgr.scan_directory()
    print(f"Scanned {len(scanned)} books:")
    for b in scanned:
        print(f"  {b['filename']} -> Collection: {b['collection']}")

    # Ingest a small slice (first 10 pages) of one book if not indexed
    new_books = mgr.check_new_pdfs()
    print(f"New or unindexed books: {len(new_books)}")
    if new_books:
        print(f"Ingesting high-yield test pages for {new_books[0]['filename']}...")
        mgr.ingest_single_book(new_books[0], max_pages=15)

    stats = vstore.get_stats()
    print(f"ChromaDB Collections Stats: {stats['collections']}")

    # Test retriever with a misspelled query
    retriever = MedicalRetriever(vector_store=vstore, embedder=embedder)
    test_query = "explain nefron filtration in the kidney"
    corrected, entity, chunks = retriever.retrieve_top_chunks(test_query, top_k=5)
    print(f"Corrected: {corrected}, Entity: {entity}")
    print(f"Retrieved {len(chunks)} chunks:")
    for i, c in enumerate(chunks):
        m = c.get('metadata', {})
        print(f"  Chunk {i+1}: {m.get('book_name')} p.{m.get('page_number')} - {c.get('document', '')[:80]}...")

    # Test Generator
    generator = NotesGenerator()
    result = generator.generate_notes(corrected, entity, chunks)
    print("\n--- GENERATED RESULT PREVIEW ---")
    print(result['content'][:500])
    print("\n--- CITATIONS ---")
    print(result.get('citations'))

if __name__ == '__main__':
    test_system()
