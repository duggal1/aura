# 🌟 Aura - Emotionally Intelligent AI Framework

Aura is a modern starter framework that combines Next.js frontend with a Python FastAPI backend to create emotionally intelligent AI applications. It uses advanced NLP models to detect emotions in user messages and responds with contextually and emotionally appropriate responses.

## ✨ Features

- 🎭 Real-time emotion analysis using state-of-the-art ML models
- 🧠 Context-aware conversations with emotion memory
- 🎨 Beautiful, responsive UI with light/dark mode
- ⚡ High-performance FastAPI backend
- 🔄 Redis-based caching for quick responses
- 📊 Built-in emotion visualization
- 🎯 Sarcasm detection
- 🤝 Multi-emotion support with intensity scoring

## 🚀 Tech Stack

### Frontend
- Next.js 15.3
- React 19
- TailwindCSS
- TypeScript
- Framer Motion for animations

### Backend
- FastAPI
- PyTorch
- Transformers (Hugging Face)
- Redis for caching
- Google's Gemini AI
- Prometheus for metrics

## 🛠 Quick Start

### Prerequisites
- Node.js 18+ and Bun
- Python 3.9+
- Redis server
- Google AI API key

### Setup

1. Clone the repository:
```bash
git clone https://github.com/duggal1/aura.git
cd aura
```

2. Install frontend dependencies:
```bash
bun install
```

3. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

4. Set up environment variables:
- Create `.env` in project root for frontend
- Create `.env` in `backend` folder for backend

5. Start both servers with a single command:
```bash
./start-servers.sh
```

Or run them separately:
```bash
# Terminal 1 - Frontend
bun run dev

# Terminal 2 - Backend
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Visit `http://localhost:3000` to see your app running!

## 🎯 Core Functionality

Aura's emotion pipeline processes messages through multiple stages:

1. **Primary Emotion Detection**: Uses DistilRoBERTa to classify primary emotions
2. **Context Analysis**: Considers conversation history
3. **Sarcasm Detection**: Uses RoBERTa-based model
4. **Response Generation**: Generates contextually appropriate responses using Gemini AI
5. **Emotion Validation**: Ensures responses match detected emotions

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📝 License

MIT

## 🙏 Acknowledgments

- Emotion detection model: [j-hartmann/emotion-english-distilroberta-base](https://huggingface.co/j-hartmann/emotion-english-distilroberta-base)
- Sarcasm detection: [jkhan447/sarcasm-detection-RoBerta-base-POS](https://huggingface.co/jkhan447/sarcasm-detection-RoBerta-base-POS)
- Next.js and FastAPI communities