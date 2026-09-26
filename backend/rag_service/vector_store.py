import chromadb
from typing import List, Dict, Any, Optional
from config import CHROMA_PERSIST_DIR, COLLECTIONS

class ChromaVectorStore:
    def __init__(self, persist_dir: str = CHROMA_PERSIST_DIR):
        self.persist_dir = persist_dir
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collections: Dict[str, Any] = {}
        self._init_collections()

    def _init_collections(self):
        """Initialize or get the 4 required collections."""
        for col_name in COLLECTIONS:
            # metadata={"hnsw:space": "cosine"} for cosine similarity
            col = self.client.get_or_create_collection(
                name=col_name,
                metadata={"hnsw:space": "cosine"}
            )
            self.collections[col_name] = col

    def get_collection(self, name: str):
        if name not in self.collections:
            self.collections[name] = self.client.get_or_create_collection(
                name=name,
                metadata={"hnsw:space": "cosine"}
            )
        return self.collections[name]

    def add_chunks(
        self,
        collection_name: str,
        chunk_ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]]
    ):
        """Add or update chunks in the specified collection."""
        col = self.get_collection(collection_name)
        # ChromaDB upsert ensures idempotence
        col.upsert(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

    def query(
        self,
        collection_name: str,
        query_embedding: List[float],
        n_results: int = 5,
        where_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Query a single collection for the top matching chunks."""
        col = self.get_collection(collection_name)
        if col.count() == 0:
            return []

        results = col.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, col.count()),
            where=where_filter
        )

        output = []
        if results and results['ids'] and len(results['ids'][0]) > 0:
            ids = results['ids'][0]
            docs = results['documents'][0] if results['documents'] else []
            metas = results['metadatas'][0] if results['metadatas'] else []
            distances = results['distances'][0] if results['distances'] else []

            for i in range(len(ids)):
                output.append({
                    "id": ids[i],
                    "document": docs[i] if i < len(docs) else "",
                    "metadata": metas[i] if i < len(metas) else {},
                    "distance": distances[i] if i < len(distances) else 1.0,
                    "collection": collection_name
                })

        return output

    def query_multi_collections(
        self,
        collection_names: List[str],
        query_embedding: List[float],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Query across multiple collections and return top_k ranked by distance."""
        combined = []
        for name in collection_names:
            matches = self.query(name, query_embedding, n_results=top_k)
            combined.extend(matches)

        # Sort by distance ascending (lower distance = higher similarity)
        combined.sort(key=lambda x: x.get('distance', 1.0))
        return combined[:top_k]

    def get_stats(self) -> Dict[str, Any]:
        """Return counts and stats for all collections."""
        stats = {}
        total_docs = 0
        for name, col in self.collections.items():
            count = col.count()
            stats[name] = count
            total_docs += count
        return {
            "collections": stats,
            "total_documents": total_docs,
            "persist_dir": self.persist_dir
        }
