# Context-Aware Chat App Backend

A modern Python backend API built with FastAPI for the context-aware chat application.

## Features

- **FastAPI**: Modern, fast web framework for building APIs
- **CORS Support**: Configured for frontend integration
- **Pydantic Models**: Type validation and serialization
- **Environment Configuration**: Secure configuration management
- **Health Checks**: Built-in health monitoring endpoints
- **Chat API**: RESTful endpoints for chat functionality

## Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Installation

1. **Create a virtual environment** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install --upgrade pip setuptools wheel

   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

### Running the Server

**Development mode** (with auto-reload):
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Production mode**:
```bash
python main.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### Health & Status
- `GET /` - Root endpoint with API info
- `GET /health` - Health check endpoint

### Chat API
- `POST /api/chat` - Send a chat message and get response
- `GET /api/messages` - Retrieve all chat messages
- `DELETE /api/messages` - Clear all chat messages

## API Usage Examples

### Send a Chat Message
```bash
curl -X POST "http://localhost:8000/api/chat" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "Hello, how are you?",
       "user_id": "user123"
     }'
```

### Get All Messages
```bash
curl -X GET "http://localhost:8000/api/messages"
```

## Project Structure

```
backend/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Development

### Adding New Features

1. **Database Integration**: Replace in-memory storage with SQLAlchemy models
2. **Authentication**: Implement JWT-based authentication
3. **Chat AI Integration**: Add OpenAI or other AI service integration
4. **WebSocket Support**: For real-time chat functionality
5. **Testing**: Add pytest-based testing suite

### Environment Variables

- `PORT`: Server port (default: 8000)
- `DATABASE_URL`: Database connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens
- `OPENAI_API_KEY`: OpenAI API key for AI chat features

### CORS Configuration

The backend is configured to accept requests from:
- http://localhost:3000 (React development server)
- http://127.0.0.1:3000

Update the `allow_origins` list in `main.py` for production domains.

## Next Steps

1. Set up your environment variables in `.env`
2. Start the development server
3. Visit http://localhost:8000/docs to explore the API
4. Integrate with your frontend application
5. Add database models and AI chat functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the context-aware chat application. 