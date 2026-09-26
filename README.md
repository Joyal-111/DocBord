# DocBord — Hybrid RAG Medical Learning System

> **Understand Medicine, Not Memorize It.**

DocBord is a hybrid Retrieval-Augmented Generation (RAG) platform tailored for medical students (MBBS/USMLE). It continuously indexes local medical reference textbooks, performs multi-stage medical retrieval across specialized collections, and synthesizes first-year MBBS pedagogical notes with clinical correlations, Mermaid diagrams, and textbook citations.

---

## 🚀 Key Features

- **Hybrid RAG Medical Learning Engine**:
  - Automatically scans textbooks (`.pdf`) recursively from `C:\Users\hp\Desktop\projects\books`.
  - Extracts text and preserves exact physical page numbers via **PyMuPDF**.
  - Splits content into semantic chunks (500–800 tokens, 100-token overlap).
  - Embeds documents with **Gemini Embedding 001** (`models/gemini-embedding-001`).
  - Stores vectors and metadata in **ChromaDB** with auto-classified collections:
    - `anatomy` (*Gray's Anatomy*, *Anatomy & Physiology Vol 2*)
    - `physiology` (*Guyton and Hall Textbook of Medical Physiology*)
    - `pathology` (*Harsh Mohan Textbook of Pathology*, *Robbins Basic Pathology*)
    - `pharmacology` (*Lippincott's Illustrated Reviews: Pharmacology*)
- **MBBS Pedagogical Synthesis**:
  - Powered by Google Gemini Flash models.
  - Explains concepts using clear, intuitive everyday analogies.
  - Maintains strict clinical and anatomical terminology.
  - Adds one relatable, real-life clinical hospital scenario.
  - Auto-generates clean Mermaid.js flowcharts for anatomical and physiological topics.
- **Strict Evidence-Based Citations**:
  - Every note concludes with verified textbook names and exact page numbers:
    ```markdown
    Source:
    * Textbook Name
    * Page Number
    ```
- **Export to PDF**: Generate print-ready `DocBord_Study_Notes.pdf` study sheets.
- **Distraction-Free UI**: Minimalist Notion + ChatGPT design, responsive layout, and Mermaid rendering.

---

## 🛠️ Tech Stack

- **Frontend**: Angular 20 (Standalone Components), Tailwind CSS, Mermaid.js, Marked, pdf-lib
- **API Gateway**: Node.js, Express, TypeScript, `@google/generative-ai`, `cors`, `dotenv`
- **RAG Microservice**: Python 3.13, FastAPI, ChromaDB, PyMuPDF, `google-genai`

---

## ⚡ Quick Start (Local Development)

### 1. Install Dependencies

```bash
# Install root & backend dependencies
npm install
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Install Python RAG dependencies
pip install pymupdf chromadb google-genai fastapi uvicorn
```

### 2. Configure Environment Variables
Inside `backend/.env`:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
BOOKS_DIR=C:\Users\hp\Desktop\projects\books
```

### 3. Run the System

```bash
# From workspace root
npm run dev
```

- Frontend: `http://localhost:4200`
- Express Backend: `http://localhost:3000`
- Python RAG Engine: `http://127.0.0.1:5001`
