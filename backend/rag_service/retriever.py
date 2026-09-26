import re
from typing import List, Dict, Any, Tuple
from classifier import detect_query_domains
from embedder import GeminiEmbedder
from vector_store import ChromaVectorStore

# Common medical spelling corrections dictionary
MEDICAL_SPELLING_MAP = {
    'tachicardia': 'Tachycardia',
    'tachycardea': 'Tachycardia',
    'erythropoisis': 'Erythropoiesis',
    'erithropoiesis': 'Erythropoiesis',
    'nefron': 'Nephron',
    'rugae': 'Gastric Rugae',
    'ruge': 'Gastric Rugae',
    'gastric ruge': 'Gastric Rugae',
    'ataxia': 'Ataxia',
    'apendicitis': 'Appendicitis',
    'appendisitis': 'Appendicitis',
    'cirhosis': 'Cirrhosis',
    'cirrhosiss': 'Cirrhosis',
    'myocardal': 'Myocardial',
    'isquemia': 'Ischemia',
    'ischaemia': 'Ischemia',
    'arrithmia': 'Arrhythmia',
    'arhythmia': 'Arrhythmia',
    'diabitis': 'Diabetes',
    'hypertention': 'Hypertension',
    'glaucoma': 'Glaucoma',
    'atherosclorosis': 'Atherosclerosis',
    'pneumona': 'Pneumonia',
    'peritonitis': 'Peritonitis',
    'meningitis': 'Meningitis'
}

class MedicalRetriever:
    def __init__(
        self,
        vector_store: ChromaVectorStore,
        embedder: GeminiEmbedder
    ):
        self.vector_store = vector_store
        self.embedder = embedder

    def correct_spelling(self, text: str) -> str:
        """
        Step 1: Correct medical spelling errors and clean prompt noise.
        """
        cleaned = text.strip()
        
        # Word-by-word replacement for known typos
        words = re.findall(r'\b\w+\b', cleaned)
        corrected_words = []
        for w in words:
            low = w.lower()
            if low in MEDICAL_SPELLING_MAP:
                corrected_words.append(MEDICAL_SPELLING_MAP[low])
            else:
                corrected_words.append(w)
        
        corrected = ' '.join(corrected_words)
        return corrected if corrected else cleaned

    def detect_medical_entity(self, text: str) -> str:
        """
        Step 2: Detect the core medical entity/subject from user query.
        Strips conversational prefixes like 'explain', 'what is', 'describe', etc.
        """
        cleaned = text.strip()
        cleaned = re.sub(
            r'^(?:explain|explane|describe|tell me about|what is|what are|basic|teach me about|notes on|overview of)\s+',
            '',
            cleaned,
            flags=re.IGNORECASE
        )
        cleaned = re.sub(r'^(?:the|a|an)\s+', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s+(?:with images?|with pictures?|diagram|diagrams|please)$', '', cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip()

        # Check full phrase in spelling map
        low = cleaned.lower()
        if low in MEDICAL_SPELLING_MAP:
            return MEDICAL_SPELLING_MAP[low]

        return cleaned if cleaned else text

    def retrieve_top_chunks(
        self,
        query: str,
        top_k: int = 5
    ) -> Tuple[str, str, List[Dict[str, Any]]]:
        """
        Full Retrieval Pipeline:
        1. Correct spelling
        2. Detect medical entity
        3. Prioritize collections
        4. Search ChromaDB using Gemini Embedding 001
        5. Retrieve Top 5 chunks with metadata
        """
        # Step 1: Correct spelling
        corrected_query = self.correct_spelling(query)

        # Step 2: Detect medical entity
        entity = self.detect_medical_entity(corrected_query)

        # Prioritize collections based on detected entity/query
        target_collections = detect_query_domains(corrected_query)
        print(f"[MedicalRetriever] Query: '{query}' -> Corrected: '{corrected_query}' | Entity: '{entity}'")
        print(f"[MedicalRetriever] Prioritized Collections: {target_collections}")

        # Step 3 & 4: Embed query & Search ChromaDB
        query_embedding = self.embedder.embed_query(corrected_query)

        # Search prioritized collections
        top_chunks = self.vector_store.query_multi_collections(
            collection_names=target_collections,
            query_embedding=query_embedding,
            top_k=top_k
        )

        # If top_chunks distance is high or entity is specific, also try querying with just the medical entity
        if len(top_chunks) < top_k and entity != corrected_query:
            try:
                entity_emb = self.embedder.embed_query(entity)
                entity_chunks = self.vector_store.query_multi_collections(
                    collection_names=target_collections,
                    query_embedding=entity_emb,
                    top_k=top_k
                )
                # Merge unique chunks
                seen_ids = {c["id"] for c in top_chunks}
                for c in entity_chunks:
                    if c["id"] not in seen_ids:
                        top_chunks.append(c)
                        seen_ids.add(c["id"])
                top_chunks.sort(key=lambda x: x.get("distance", 1.0))
                top_chunks = top_chunks[:top_k]
            except Exception as e:
                print(f"[MedicalRetriever] Entity query search note: {e}")

        print(f"[MedicalRetriever] Retrieved {len(top_chunks)} chunks from ChromaDB.")
        for idx, chunk in enumerate(top_chunks):
            meta = chunk.get("metadata", {})
            print(f"  Chunk {idx+1}: [{chunk.get('collection')}] {meta.get('book_name')} - Page {meta.get('page_number')} (dist: {chunk.get('distance', 0):.4f})")

        return corrected_query, entity, top_chunks
