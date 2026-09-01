# AI Code Reviewer

An intelligent, full-stack code review assistant powered by **Google Gemini 3.6 Flash**. It provides actionable, senior-engineer-level feedback with categorized insights on bugs, security vulnerabilities, performance optimizations, and best practices. Features a modern Next.js 14 web application with a Monaco Editor, live SSE streaming, 1-click automated fix generator, and GitHub Actions PR review integration.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg?logo=next.js&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.6%20Flash-4285F4.svg?logo=google&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC.svg?logo=tailwind-css&logoColor=white)

---

## ✨ Features

- 💻 **Monaco Code Editor**: Syntax-highlighted code editor supporting multiple programming languages with line numbers and intuitive editing.
- ⚡ **Real-time SSE Streaming**: Live Server-Sent Events (SSE) stream AI reviews token-by-token directly to the UI.
- 🧠 **Structured AI Reviews**: Mentorship-focused JSON feedback categorized into:
  - 🐛 **Bugs & Logic Errors**
  - 🛡️ **Security Vulnerabilities**
  - ⚡ **Performance & Complexity**
  - 📖 **Best Practices & Code Quality**
  - 🌟 **Positive Highlights**
- 🛠️ **1-Click Apply Fix**: Generate and merge AI-suggested code fixes into the editor in real-time with automated diff handling.
- 🔄 **Smart Fallback & Retry Handling**: Built-in exponential backoff retry mechanism for rate limits (429) and transparent fallback to synchronous review endpoints.
- 🤖 **GitHub Actions CI Bot**: Automatically review Pull Requests and post structured review comments on GitHub (`scripts/run_review.py`).
- 🎨 **Modern Glassmorphic UI**: Ambient animated video background, smooth page transitions, 3D loader, and responsive dark aesthetics.

---


## 📁 Project Structure

```
AI Code Reviewer/
├── app/                          # FastAPI Backend
│   ├── __init__.py               # Python module definition
│   ├── gemini_utils.py           # Shared Gemini API caller & retry logic
│   └── main.py                   # FastAPI app (/review/stream, /review/, /fix/)
├── ai-code-review-ui/            # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx              # Main Reviewer UI
│   │   ├── layout.tsx            # Root layout & meta
│   │   └── globals.css           # Global Tailwind CSS tokens
│   ├── components/
│   │   ├── BackgroundVideo.tsx   # Ambient background video layer
│   │   ├── CodeEditor.tsx        # Monaco code editor
│   │   ├── FadeInView.tsx        # Framer Motion entrance animation
│   │   ├── InitialLoader.tsx     # 3D animated greeting loader
│   │   ├── LoadingOverlay.tsx    # Loading spinner & overlay
│   │   ├── PageTransition.tsx    # Smooth page wrapper
│   │   ├── ReviewDisplay.tsx     # Structured review tabs & suggestions
│   │   └── StatusIndicator.tsx   # AI status badge
│   ├── public/                   # Static assets & background video
│   └── package.json              # Frontend dependencies
├── scripts/
│   └── run_review.py             # CI / GitHub Action review script
├── .github/workflows/
│   └── review_pr.yml             # GitHub Actions workflow for PR reviews
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variables template
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** (or npm / pnpm / yarn)
- **Google Gemini API Key** ([Get your free key here](https://aistudio.google.com/app/apikey))

---

### 1. Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/subhajit1560/AI-Code-Reviewer.git
   cd AI-Code-Reviewer
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # On macOS / Linux:
   python3 -m venv venv
   source venv/bin/activate

   # On Windows (PowerShell):
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. **Start the FastAPI backend:**
   ```bash
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   Backend will be running at `http://127.0.0.1:8000` (API docs at `http://127.0.0.1:8000/docs`).

---

### 2. Frontend Setup

1. **Navigate to the UI folder:**
   ```bash
   cd ai-code-review-ui
   ```

2. **Install npm packages:**
   ```bash
   npm install
   ```

3. **Start the Next.js development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Visit [http://localhost:3000](http://localhost:3000).

---

## 🔌 API Reference

### `GET /health/`
Checks backend and AI model connectivity.
```json
{
  "status": "healthy",
  "model": "gemini-3.6-flash"
}
```

### `POST /review/stream`
Streams AI review chunks via Server-Sent Events (SSE).
- **Body:** `{"code": "string"}`
- **Events:** `chunk` (incremental text), `done` (full review JSON), `error` (failure details).

### `POST /review/`
Synchronous fallback code review endpoint returning structured review JSON.
- **Body:** `{"code": "string"}`

### `POST /fix/`
Generates full corrected replacement code for a selected issue.
- **Body:**
  ```json
  {
    "code": "def add(a, b): return a + b",
    "issue_message": "Missing type annotations",
    "line": 1,
    "original_snippet": "def add(a, b):"
  }
  ```
- **Response:**
  ```json
  {
    "fixed_code": "def add(a: int | float, b: int | float) -> int | float:\n    return a + b"
  }
  ```

---

## 🤖 GitHub Action Integration

To enable automated AI code reviews on your repository:
1. Add `GEMINI_API_KEY` to your GitHub repository secrets (**Settings > Secrets and variables > Actions**).
2. The workflow file [`.github/workflows/review_pr.yml`](.github/workflows/review_pr.yml) triggers automatically on `pull_request` events, running [`scripts/run_review.py`](scripts/run_review.py) to analyze the diff and leave inline feedback.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **AI Model** | Google Gemini 3.6 Flash |
| **Backend** | Python, FastAPI, Uvicorn, HTTPX, Pydantic, sse-starlette |
| **Frontend** | Next.js 14, React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **CI/CD** | GitHub Actions |

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

*Powered by Google Gemini 3.6 Flash • Built with Next.js & FastAPI • Created by [Subhajit](https://github.com/subhajit1560)*
