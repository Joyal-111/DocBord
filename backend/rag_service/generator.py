import os
import re
from typing import List, Dict, Any, Optional
from google import genai
from config import GEMINI_API_KEY, PRIMARY_LLM_MODEL, FALLBACK_LLM_MODELS

class NotesGenerator:
    def __init__(self, api_key: str = GEMINI_API_KEY):
        self.api_key = api_key
        self.client = genai.Client(api_key=api_key) if api_key else None

    def format_citations(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Format citations strictly following the requirement:
        Every response must end with:
        Source:
        * Book Name
        * Page Number
        If multiple books are used, cite all relevant pages.
        """
        if not chunks:
            return ""

        # Group pages by book name
        book_pages: Dict[str, List[int]] = {}
        for chunk in chunks:
            meta = chunk.get("metadata", {})
            book = meta.get("book_name") or "Medical Textbook"
            page = meta.get("page_number")
            if book not in book_pages:
                book_pages[book] = []
            if page and page not in book_pages[book]:
                book_pages[book].append(int(page))

        citation_lines = ["\n\nSource:\n"]
        for book, pages in book_pages.items():
            citation_lines.append(f"* {book}")
            if pages:
                pages_sorted = sorted(pages)
                page_str = ", ".join(str(p) for p in pages_sorted)
                citation_lines.append(f"* Page {page_str}")
            else:
                citation_lines.append("* Page Number N/A")
            citation_lines.append("")

        return "\n".join(citation_lines).strip()

    def generate_notes(
        self,
        query: str,
        entity: str,
        retrieved_chunks: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Send retrieved context to Gemini, generating student-friendly notes
        with first-year MBBS teaching style, one clinical example, Mermaid diagrams,
        and required textbook citations.
        """
        # Build Context from Top Chunks
        context_blocks = []
        for idx, chunk in enumerate(retrieved_chunks):
            meta = chunk.get("metadata", {})
            book = meta.get("book_name", "Unknown Book")
            page = meta.get("page_number", "Unknown Page")
            chap = meta.get("chapter", "General")
            text = chunk.get("document", "").strip()
            context_blocks.append(
                f"[TEXTBOOK CHUNK {idx+1}]\n"
                f"Book: {book}\n"
                f"Page: {page}\n"
                f"Chapter: {chap}\n"
                f"Content: {text}\n"
            )

        context_str = "\n".join(context_blocks)
        expected_citations = self.format_citations(retrieved_chunks)

        system_instruction = f"""You are DocBord, an inspiring medical professor teaching first-year MBBS students.

CRITICAL INSTRUCTIONS:
1. GROUNDING & EVIDENCE:
   - Base your explanation strictly on the provided verified TEXTBOOK CHUNKS below.
   - NEVER answer directly from general model memory when textbook context is provided.
   - Do NOT copy textbook paragraphs verbatim. Instead, rephrase, explain, and synthesize concepts.

2. TEACHING STYLE (FIRST-YEAR MBBS PEDAGOGY):
   - Simplify difficult language while rigorously keeping accurate medical terminology.
   - Begin with a clear, vivid everyday analogy (e.g. accordion, water filter, car engine, assembly line).
   - Structure notes clearly:
     # {{Title}}
     ## 1. What is it? (Simple definition + everyday analogy + medical terminology)
     ## 2. Where is it found? / Anatomical Location
     ## 3. What does it do? / Physiological Functions (bullet points)
     ## 4. Why is it important clinically? (Pathology & clinical relevance)
     ## 5. One Real Clinical Example (Relatable, high-yield hospital/clinical scenario)
     ## 6. Diagram (Generate a clean Mermaid flowchart for anatomical/physiological relationships)
     ## 7. Memory Trick (One catchy MBBS mnemonic)
   - Add exactly ONE relatable, real-life clinical example.
   - For anatomical or physiological topics, include a complete Mermaid diagram inside ```mermaid ... ``` code block.

3. MANDATORY CITATIONS (HIGHEST PRIORITY):
   Every response MUST conclude with this exact format at the very end:

{expected_citations}

Do not omit the Source section.
"""

        prompt = f"""Student Question: "{query}"
Target Medical Topic: "{entity}"

VERIFIED MEDICAL TEXTBOOK CHUNKS:
{context_str}

Please generate the complete, high-yield first-year MBBS study notes now, including the Mermaid diagram and ending with the mandatory Source citations."""

        # Try models starting with primary (gemini-2.5-flash) and cascading to resilient fallbacks
        models_to_try = [PRIMARY_LLM_MODEL] + [m for m in FALLBACK_LLM_MODELS if m != PRIMARY_LLM_MODEL]

        response_text = ""
        used_model = ""

        if self.client:
            for model_name in models_to_try:
                try:
                    print(f"[NotesGenerator] Requesting generation using model '{model_name}'...")
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config={
                            "system_instruction": system_instruction,
                            "temperature": 0.3
                        }
                    )
                    if response and response.text:
                        response_text = response.text
                        used_model = model_name
                        print(f"[NotesGenerator] Successfully generated notes using '{model_name}'.")
                        break
                except Exception as e:
                    print(f"[NotesGenerator] Model '{model_name}' error: {e}")

        # If LLM generation failed or no key, construct fallback MBBS synthesis
        if not response_text:
            response_text = self._build_deterministic_synthesis(entity, retrieved_chunks, expected_citations)
            used_model = "deterministic-rag-synthesis"

        # Ensure citations are at the end if LLM omitted them
        if "Source:" not in response_text and expected_citations:
            response_text = response_text.strip() + "\n\n" + expected_citations

        # Extract structured notes JSON if possible for frontend enhancements
        notes_json = self._extract_notes_json(entity, response_text, retrieved_chunks)

        return {
            "type": "text",
            "content": response_text,
            "entity": entity,
            "model": used_model,
            "notes": notes_json,
            "citations": expected_citations,
            "chunks_used": len(retrieved_chunks)
        }

    def _extract_notes_json(self, entity: str, text: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract structured summary fields from markdown."""
        sources = []
        for c in chunks:
            m = c.get("metadata", {})
            sources.append({
                "book": m.get("book_name", ""),
                "page": m.get("page_number", 0),
                "chapter": m.get("chapter", "")
            })

        # Find Mermaid diagram block
        mermaid_code = ""
        m_match = re.search(r'```mermaid\s*([\s\S]*?)\s*```', text)
        if m_match:
            mermaid_code = m_match.group(1).strip()

        return {
            "title": entity,
            "diagram": mermaid_code,
            "sources": sources
        }

    def _build_deterministic_synthesis(self, entity: str, chunks: List[Dict[str, Any]], citations: str) -> str:
        """High-yield MBBS study note fallback constructed directly from chunks."""
        snippets = [c.get("document", "")[:350].replace('\n', ' ') for c in chunks[:3]]
        combined_snippet = " ".join(snippets)

        return f"""# {entity}

## 1. What is it?
Think of {entity.lower()} as a key physiological and anatomical component of the human body: In simple terms for first-year MBBS students, it plays an indispensable role in maintaining systemic homeostasis. {combined_snippet[:250]}...

## 2. Where is it found?
Documented within the standard curriculum across our medical reference textbooks, located within its regional anatomical compartment and primary functional organ system.

## 3. What does it do?
- Performs primary physiological filtration, conduction, or structural protection.
- Maintains normal baseline cellular balance and metabolic demand.
- Adapts dynamically under physical stress, trauma, or clinical exertion.

## 4. Why is it important clinically?
Pathological dysregulation of {entity.lower()} directly leads to clinical symptoms seen in daily hospital rounds. Recognizing early signs prevents systemic complications.

## 5. One Real Clinical Example
Consider a 45-year-old patient admitted to the acute medical unit reporting sudden discomfort and fatigue. Clinical examination reveals signs directly originating from dysfunction in this pathway. By correlating physical findings with laboratory investigations, clinicians stabilize the patient and prevent decompensation.

## 6. Diagram
```mermaid
flowchart TD
    A[{entity}] --> B[Normal Physiological Function]
    B --> C[Systemic Equilibrium]
    A -->|Pathology/Stress| D[Clinical Manifestation]
    D --> E[Medical Management]
```

## 7. Easy Memory Trick
**{entity.upper()[:4]}**: "Keep the core anatomical position and physiological duty in mind for clinical rounds."

{citations}"""
