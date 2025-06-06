# Context-Aware Chat Application

A modern, real-time chat application that allows users to upload PDF documents and have intelligent conversations about their content using AI. Built with React frontend and FastAPI backend, featuring streaming responses, conversation persistence, and comprehensive token usage tracking.

## 🌟 Features

- **PDF Document Processing**: Upload PDFs and chat about their content
- **Real-time Streaming**: Live AI responses with Server-Sent Events (SSE)
- **Conversation Management**: Multiple chat sessions with persistent history
- **Token Usage Tracking**: Monitor API usage and costs in real-time
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Smart Text Chunking**: Optimized document processing for better context retrieval
- **Error Handling**: Comprehensive error handling with user-friendly notifications

## 🏗️ Architecture

### Backend (FastAPI + Python)
- **FastAPI** for high-performance async API
- **OpenAI API** for embeddings and chat completions
- **RecursiveCharacterTextSplitter** for intelligent document chunking
- **Cosine similarity** for context retrieval
- **In-memory storage** for demo purposes (easily replaceable with database)

### Frontend (React + Modern UI)
- **React 19** with modern hooks and context
- **Server-Sent Events** for real-time streaming
- **Sonner** for beautiful toast notifications
- **Lucide React** for consistent iconography
- **CSS Modules** for component-scoped styling

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **OpenAI API Key**

### Backend Setup

1. **Clone and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env file with your OpenAI API key
   ```

5. **Start the backend server:**
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```
   The application will open at `http://localhost:3000`

## 📋 Usage

1. **Upload a PDF**: Click the upload button and select a PDF document
2. **Wait for Processing**: The system will chunk and embed your document
3. **Start Chatting**: Ask questions about your document's content
4. **Multiple Conversations**: Create new chats or switch between existing ones
5. **Monitor Usage**: Check token usage and costs in the sidebar

## 🔧 Environment Variables

### Backend (.env)
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Frontend
No environment variables required for basic setup. The frontend connects to `http://localhost:8000` by default.

## 🎯 Design Decisions

### Document Processing Strategy
- **RecursiveCharacterTextSplitter**: Chosen for superior performance in maintaining context boundaries
- **400-character chunks**: Optimized balance between context preservation and retrieval precision
- **No overlap**: Prevents duplicate information while maintaining clear boundaries
- **Custom separators**: `["\n\n", "\n", ".", "?", "!", " ", ""]` for semantic chunking

### State Management
- **React Context**: For global state like token usage
- **Backend persistence**: Messages stored on server for conversation reconstruction

### UI/UX Decisions
- **Toast notifications**: Non-intrusive feedback using Sonner
- **Auto-focus**: Textarea automatically focuses for better user flow
- **Smart scrolling**: User messages at top, AI responses stream naturally

## 🛠️ Challenges Faced & Solutions

### 1. **Dependency Management**
- **Challenge**: Version conflicts on the backend dependencies
- **Solution**: Carefully selected compatible (latest) versions

### 2. **Context Provider Architecture**
- **Challenge**: Initially tried real-time health streaming which caused excessive re-renders
- **Solution**: Fetch health status on file upload and initial render

### 3. **Document Chunking Performance**
- **Challenge**: Initial chunking strategy poor at answering meta-questions about documents
- **Solution**: Implemented RecursiveCharacterTextSplitter with optimized separators

### 4. **Message Persistence**
- **Challenge**: Conversations lost on page reload
- **Solution**: Added backend message storage with conversation reconstruction

## Improvements

- **Export Functionality**: Export conversations as PDF or markdown
- **API Rate Limiting**: Implement proper rate limiting in the backend
- **File Format Support**: Extend to Word docs, text files, and images
- **Markdown Rendering**: Render the chat responses as markdown
- **Folder Structure**: Improve the architecture to achieve more modularity

## 📝 API Documentation

With the backend running, visit `http://localhost:8000/docs` for interactive API documentation.

### Key Endpoints
- `POST /upload-pdf` - Upload and process PDF documents
- `GET /chat/stream` - Streaming chat endpoint
- `GET /messages` - Retrieve all messages
- `DELETE /messages/clear/{chat_id}` - Clear specific conversation
- `GET /tokens/usage` - Get token usage statistics
- `GET /health` - Get the current state of the server and context
