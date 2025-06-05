import React, { useState, useCallback, useEffect } from "react";
import "./App.css";
import AppContainer from "./components/AppContainer/AppContainer";
import ChatInterface from "./pages/ChatInterface";

function App() {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  // Generate unique ID for new chats
  const generateChatId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Create initial chat on app start
  useEffect(() => {
    const initialChatId = generateChatId();
    const initialChat = {
      id: initialChatId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setChatHistory([initialChat]);
    setCurrentChatId(initialChatId);
  }, []);

  const handleNewChat = useCallback(() => {
    const newChatId = generateChatId();
    const newChat = {
      id: newChatId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
  }, []);

  const handleClearConversation = useCallback(() => {
    if (currentChatId) {
      setChatHistory(prev =>
        prev.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages: [], updatedAt: new Date() }
            : chat
        )
      );
    }
  }, [currentChatId]);

  const handleSelectChat = useCallback((chatId) => {
    setCurrentChatId(chatId);
  }, []);

  const handleDeleteChat = useCallback((chatId) => {
    setChatHistory(prev => {
      const filtered = prev.filter(chat => chat.id !== chatId);

      // If we deleted the current chat, switch to another one or create new
      if (chatId === currentChatId) {
        if (filtered.length > 0) {
          setCurrentChatId(filtered[0].id);
        } else {
          // Create a new chat if no chats remain
          const newChatId = generateChatId();
          const newChat = {
            id: newChatId,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          setCurrentChatId(newChatId);
          return [newChat];
        }
      }

      return filtered;
    });
  }, [currentChatId]);

  const updateCurrentChatMessages = useCallback((messages) => {
    if (currentChatId) {
      setChatHistory(prev =>
        prev.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages, updatedAt: new Date() }
            : chat
        )
      );
    }
  }, [currentChatId]);

  const getCurrentChat = () => {
    return chatHistory.find(chat => chat.id === currentChatId) || { messages: [] };
  };

  return (
    <div className="App">
      <AppContainer
        onClearConversation={handleClearConversation}
        onNewChat={handleNewChat}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      >
        <ChatInterface
          currentChat={getCurrentChat()}
          onUpdateMessages={updateCurrentChatMessages}
        />
      </AppContainer>
    </div>
  );
}

export default App;
