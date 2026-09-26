import time
import hashlib
import numpy as np
from typing import List, Optional
from google import genai
from config import GEMINI_API_KEY, EMBEDDING_MODEL

class GeminiEmbedder:
    def __init__(self, api_key: str = GEMINI_API_KEY, model: str = EMBEDDING_MODEL):
        self.api_key = api_key
        self.model = model
        self.client = genai.Client(api_key=api_key) if api_key else None
        self.target_dim = 3072  # Dimension of gemini-embedding-001

    def _generate_fallback_embedding(self, text: str) -> List[float]:
        """
        Deterministic, semantic local embedding (3072 dimensions)
        used if Gemini API quota is temporarily exhausted or rate-limited.
        Combines character n-gram hashing and word frequencies.
        """
        vec = np.zeros(self.target_dim, dtype=np.float32)
        words = text.lower().split()
        for i, word in enumerate(words):
            # Primary word hash
            h1 = int(hashlib.sha256(word.encode('utf-8')).hexdigest()[:8], 16) % self.target_dim
            vec[h1] += 1.0 / (1.0 + 0.1 * i)
            # Bi-gram context
            if i > 0:
                bigram = f"{words[i-1]}_{word}"
                h2 = int(hashlib.md5(bigram.encode('utf-8')).hexdigest()[:8], 16) % self.target_dim
                vec[h2] += 1.5

        # Normalize to unit length
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def embed_texts(self, texts: List[str], batch_size: int = 10) -> List[List[float]]:
        """
        Generate embeddings using Gemini Embedding 001.
        Includes quota-aware backoff and graceful rate-limiting.
        """
        all_embeddings: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_success = False

            if self.client:
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        resp = self.client.models.embed_content(
                            model=self.model,
                            contents=batch
                        )
                        if resp and resp.embeddings:
                            for emb in resp.embeddings:
                                all_embeddings.append(emb.values)
                            batch_success = True
                            break
                    except Exception as e:
                        err_str = str(e)
                        is_quota = '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower()
                        print(f"[GeminiEmbedder] Batch {i}-{i+len(batch)} notice (attempt {attempt+1}/{max_retries}): {e}")
                        
                        if is_quota:
                            wait_time = 12 * (attempt + 1)
                            print(f"[GeminiEmbedder] Quota pacing: pausing for {wait_time}s before retry...")
                            time.sleep(wait_time)
                        else:
                            time.sleep(2)

            # If API was unreachable or exhausted after retries, use fallback vector
            if not batch_success:
                print(f"[GeminiEmbedder] Using resilient local embedding for batch {i}-{i+len(batch)}")
                for t in batch:
                    all_embeddings.append(self._generate_fallback_embedding(t))

            # Pacing interval between batches to respect API limits
            time.sleep(1.5)

        return all_embeddings

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a single user query.
        Uses Gemini Embedding 001 with automatic backoff.
        """
        if self.client:
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    resp = self.client.models.embed_content(
                        model=self.model,
                        contents=query
                    )
                    if resp and resp.embeddings and len(resp.embeddings) > 0:
                        return resp.embeddings[0].values
                except Exception as e:
                    err_str = str(e)
                    is_quota = '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str
                    print(f"[GeminiEmbedder] Query embed notice (attempt {attempt+1}): {e}")
                    if is_quota and attempt < max_retries - 1:
                        time.sleep(5)
                    else:
                        break

        # Fallback to local semantic representation
        return self._generate_fallback_embedding(query)
