import re
import pymupdf
from typing import List, Dict, Any, Optional

def approximate_token_count(text: str) -> int:
    """Approximate token count based on whitespace and punctuation."""
    words = len(text.split())
    # Typically 1 token is ~0.75 words, so tokens = words * 1.33
    return int(words * 1.33)

def detect_chapter_from_toc(toc: List[Any], page_num: int) -> Optional[str]:
    """Find the most specific TOC title for a given 1-based page number."""
    if not toc:
        return None
    
    current_chapter = None
    for item in toc:
        # item is [lvl, title, page, ...]
        if len(item) >= 3:
            item_page = item[2]
            title = item[1].strip()
            if item_page <= page_num:
                current_chapter = title
            else:
                break
    return current_chapter

def detect_chapter_from_text(page_text: str) -> Optional[str]:
    """Detect chapter or section heading from the first few lines of page text."""
    lines = [l.strip() for l in page_text.split('\n') if l.strip()]
    if not lines:
        return None

    # Check for explicit Chapter/Section markers
    for line in lines[:5]:
        if re.search(r'^(?:chapter|section|part|unit)\s+[0-9ivxcdl]+[:\s\.\-]', line, re.IGNORECASE):
            return line[:100]

    # Check for all-caps running header (typical in anatomy/pathology textbooks)
    for line in lines[:3]:
        if len(line) >= 4 and line.isupper() and not line.isdigit() and len(line) <= 80:
            return line

    return None

def clean_extracted_text(text: str) -> str:
    """Clean extracted PDF text while preserving sentence structure."""
    if not text:
        return ""
    
    # Fix hyphenated line breaks (e.g. "myo-\ncardium" -> "myocardium")
    text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
    
    # Replace multiple newlines with standard paragraph break
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Replace single line breaks inside sentences with spaces
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    
    # Normalize multiple whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    
    return text.strip()

def split_into_semantic_chunks(
    text: str,
    page_number: int,
    book_name: str,
    chapter: str,
    min_tokens: int = 500,
    max_tokens: int = 800,
    overlap_tokens: int = 100
) -> List[Dict[str, Any]]:
    """
    Split text into semantic chunks of 500-800 tokens with 100-token overlap,
    preserving exact page number, book name, chapter, and generating a unique chunk_id.
    """
    cleaned = clean_extracted_text(text)
    if not cleaned or len(cleaned.split()) < 15:
        return []

    words = cleaned.split()
    total_tokens = approximate_token_count(cleaned)

    # Words corresponding to min, max, overlap
    target_words = int(max_tokens / 1.33)  # ~600 words
    overlap_words = int(overlap_tokens / 1.33)  # ~75 words
    step_words = max(50, target_words - overlap_words)

    # If text is already under max_tokens, return as single chunk
    if total_tokens <= max_tokens:
        slug = re.sub(r'[^a-zA-Z0-9]', '_', book_name)[:20].lower()
        chunk_id = f"{slug}_p{page_number}_c0"
        return [{
            "text": cleaned,
            "metadata": {
                "book_name": book_name,
                "chapter": chapter or "General",
                "page_number": int(page_number),
                "chunk_id": chunk_id
            }
        }]

    # Multi-chunk splitting with overlap
    chunks = []
    chunk_index = 0
    slug = re.sub(r'[^a-zA-Z0-9]', '_', book_name)[:20].lower()

    i = 0
    while i < len(words):
        chunk_words = words[i:i + target_words]
        chunk_text = ' '.join(chunk_words).strip()
        
        # Don't add tiny trailing snippets unless it has some substance
        if len(chunk_words) >= 40 or not chunks:
            chunk_id = f"{slug}_p{page_number}_c{chunk_index}"
            chunks.append({
                "text": chunk_text,
                "metadata": {
                    "book_name": book_name,
                    "chapter": chapter or "General",
                    "page_number": int(page_number),
                    "chunk_id": chunk_id
                }
            })
            chunk_index += 1

        i += step_words

    return chunks

def extract_book_chunks(
    pdf_path: str,
    book_name: str,
    min_tokens: int = 500,
    max_tokens: int = 800,
    overlap_tokens: int = 100,
    max_pages: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Extract text from a textbook PDF using PyMuPDF, preserve page numbers,
    detect chapters, and split into semantic chunks.
    """
    doc = pymupdf.open(pdf_path)
    toc = doc.get_toc()
    all_chunks = []
    current_chapter = "General"

    page_limit = min(len(doc), max_pages) if max_pages else len(doc)

    for p in range(page_limit):
        page_num = p + 1  # 1-indexed page number
        page = doc[p]
        page_text = page.get_text()

        if not page_text or len(page_text.strip()) < 20:
            continue

        # Detect chapter
        toc_chap = detect_chapter_from_toc(toc, page_num)
        text_chap = detect_chapter_from_text(page_text)
        if toc_chap:
            current_chapter = toc_chap
        elif text_chap:
            current_chapter = text_chap

        page_chunks = split_into_semantic_chunks(
            text=page_text,
            page_number=page_num,
            book_name=book_name,
            chapter=current_chapter,
            min_tokens=min_tokens,
            max_tokens=max_tokens,
            overlap_tokens=overlap_tokens
        )
        all_chunks.extend(page_chunks)

    doc.close()
    return all_chunks
