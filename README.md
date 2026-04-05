# AI Code Review Bot

An intelligent code review assistant powered by Google Gemini AI that provides detailed feedback on your code like a senior software engineer.

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Comprehensive Code Analysis** - Identifies bugs, security issues, and performance bottlenecks
- **Best Practice Recommendations** - Suggests improvements following industry standards
- **Multiple Language Support** - Works with Python, JavaScript, TypeScript, Java, C++, and more
- **Smart Feedback** - Context-aware reviews with specific, actionable recommendations
- **Fast & Reliable** - Powered by Google Gemini 2.5 Flash for quick responses
- **Beautiful UI** - Modern, responsive interface built with Next.js and Tailwind CSS

## Screenshots

### Main Interface
The clean, intuitive interface makes code review simple and efficient.

### Review Output
Detailed, structured feedback covering bugs, security, performance, and best practices.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌──────────────────┐
│   Next.js       │  HTTP   │   FastAPI       │   API   │  Google Gemini   │
│   Frontend      │────────▶│   Backend       │────────▶│   1.5 Flash      │
│   (Port 3000)   │         │   (Port 8000)   │         │                  │
└─────────────────┘         └─────────────────┘         └──────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- Google Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-code-review-bot.git
   cd ai-code-review-bot
   ```

2. **Set up Python virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install fastapi uvicorn requests python-dotenv pydantic
   ```

4. **Create `.env` file**
   ```bash
   echo "GEMINI_API_KEY=your_api_key_here" > .env
   ```

5. **Run the FastAPI server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend  # or wherever your Next.js app is
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ai-code-review-bot/
├── app/
│   └── main.py              # FastAPI backend application
├── frontend/                # Next.js frontend (if separate)
│   ├── app/
│   │   └── page.tsx        # Main code review page
│   ├── components/
│   │   └── ui/             # Shadcn UI components
│   └── package.json
├── .env                     # Environment variables (not in repo)
├── .gitignore
├── requirements.txt         # Python dependencies
└── README.md
```

## Configuration

### Backend Configuration

Edit `app/main.py` to customize:

```python
# Change the AI model
MODEL_NAME = "gemini-2.5-flash"  

# Adjust generation parameters
"generationConfig": {
    "temperature": 0.4,      # Lower = more focused
    "maxOutputTokens": 4096, # Max response length
    "topP": 0.95,
    "topK": 40
}

# CORS settings for production
allow_origins=[
    "http://localhost:3000",
    "https://your-domain.com"  # Add your domain
]
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

## API Documentation

### Endpoints

#### `GET /`
Health check endpoint
```json
{
  "message": "AI Code Review Bot API",
  "version": "1.0.0",
  "model": "gemini-1.5-flash"
}
```

#### `GET /health/`
Service health status
```json
{
  "status": "healthy",
  "model": "gemini-2.5-flash"
}
```

#### `POST /review/`
Submit code for review

**Request Body:**
```json
{
  "code": "def add(a, b):\n    return a + b",
  "language": "python"  // optional
}
```

**Response:**
```json
{
  "review": "## Code Review...",
  "success": true,
  "token_count": 1234
}
```

**Error Response:**
```json
{
  "detail": "Error message here"
}
```

## Usage Examples

### Python Function Review
```python
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)
```

### JavaScript Code Review
```javascript
function fetchUserData(userId) {
    const response = fetch(`/api/users/${userId}`);
    return response.json();
}
```

### Git Diff Review
```diff
- const data = response.json();
+ const data = await response.json();
```

## Development

### Running Tests
```bash
# Backend tests
pytest

# Frontend tests
npm test
```

### Code Formatting
```bash
# Python
black app/
isort app/

# Frontend
npm run format
```

### Building for Production

**Backend:**
```bash
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**Frontend:**
```bash
npm run build
npm start
```

## Docker Deployment

```dockerfile
# Dockerfile for backend
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## Acknowledgments

- [Google Gemini](https://ai.google.dev/) for the powerful AI model
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent Python framework
- [Next.js](https://nextjs.org/) for the React framework
- [Shadcn UI](https://ui.shadcn.com/) for the beautiful components
- [Tailwind CSS](https://tailwindcss.com/) for the styling utilities


## Roadmap

- [ ] Support for more AI models (Claude, GPT-4)
- [ ] GitHub integration for PR reviews
- [ ] VS Code extension
- [ ] Batch file review
- [ ] Custom review templates
- [ ] Team collaboration features
- [ ] Review history and analytics
- [ ] Export reviews as PDF/Markdown

## Limitations

- Maximum code length: 10,000 characters per request
- Rate limits apply based on your Gemini API tier
- Some languages may receive better reviews than others
- AI-generated feedback should be validated by human developers

## Performance

- Average response time: 2-5 seconds
- Supports concurrent requests
- Token usage: ~500-2000 tokens per review
- Uptime: 99.9% (dependent on Gemini API)

---

Made with ❤️ by Aahana
