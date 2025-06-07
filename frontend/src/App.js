import React, { useState, useCallback, useEffect } from "react";
import "./App.css";
import AppContainer from "./components/AppContainer/AppContainer";
import ChatInterface from "./pages/ChatInterface";
import { Toaster, toast } from "sonner";
import { TokenUsageProvider } from "./contexts/TokenUsageContext";

function App() {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // API Base URL from environment variable
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Load conversations on render
  useEffect(() => {
    fetchAndReconstructConversations();
  }, []);

  // Generate unique ID for new chats
  const generateChatId = () => {
    return Date.now().toString() + Math.random().toString(36).substring(2, 11);
  };

  // Fetch all messages and reconstruct conversations
  const fetchAndReconstructConversations = async () => {
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`${API_BASE_URL}/messages`);

      if (response.ok) {
        const allMessages = await response.json();
        if (allMessages.length > 0) {
          // Group messages by chat_id
          const chatGroups = {};

          allMessages.forEach((msg) => {
            if (!chatGroups[msg.chat_id]) {
              chatGroups[msg.chat_id] = [];
            }
            chatGroups[msg.chat_id].push(msg);
          });

          // Create chat history from grouped messages
          const reconstructedChats = Object.keys(chatGroups).map(chatId => {
            // Convert messages for this specific chat
            const chatMessages = chatGroups[chatId].map((msg, index) => {
              // Alternate roles within each chat: even positions are human, odd are AI
              const role = index % 2 === 0 ? "human" : "ai";
              return {
                role: role,
                content: msg.message,
                timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
              };
            });

            return {
              id: chatId,
              messages: chatMessages,
              createdAt: chatMessages[0]?.timestamp ? new Date(chatMessages[0].timestamp) : new Date(),
              updatedAt: chatMessages[chatMessages.length - 1]?.timestamp ? new Date(chatMessages[chatMessages.length - 1].timestamp) : new Date(),
            };
          });
          // Sort chats by most recent activity (you could use actual timestamps)
          reconstructedChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

          setChatHistory(reconstructedChats);

          // Set the most recent chat as current
          if (reconstructedChats.length > 0) {
            setCurrentChatId(reconstructedChats[0].id);
          }

        } else {
          // No messages in backend, create initial chat
          createInitialChat();
        }
      } else {
        console.error("Failed to fetch messages from backend");
        createInitialChat();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      createInitialChat();
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Create initial chat when no messages exist
  const createInitialChat = () => {
    const initialChatId = generateChatId();
    const initialChat = {
      id: initialChatId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setChatHistory([initialChat]);
    setCurrentChatId(initialChatId);
  };

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

  const handleClearConversation = useCallback(async () => {
    if (currentChatId) {
      try {
        // Call backend to clear messages for this chat
        const response = await fetch(`${API_BASE_URL}/messages/clear/${currentChatId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Update frontend state to clear messages for this chat
          setChatHistory(prev =>
            prev.map(chat =>
              chat.id === currentChatId
                ? { ...chat, messages: [], updatedAt: new Date() }
                : chat
            )
          );

          // Show success notification
          toast.success("Conversation cleared", {
            description: "All messages in this conversation have been deleted.",
          });
        } else {
          console.error('Failed to clear conversation on backend');
          toast.error("Failed to clear conversation", {
            description: "There was an error clearing the conversation. Please try again.",
          });
          // Still update frontend state as fallback
          setChatHistory(prev =>
            prev.map(chat =>
              chat.id === currentChatId
                ? { ...chat, messages: [], updatedAt: new Date() }
                : chat
            )
          );
        }
      } catch (error) {
        console.error('Error clearing conversation:', error);
        toast.error("Network error", {
          description: "Unable to clear conversation. Please check your connection.",
        });
        // Still update frontend state as fallback
        setChatHistory(prev =>
          prev.map(chat =>
            chat.id === currentChatId
              ? { ...chat, messages: [], updatedAt: new Date() }
              : chat
          )
        );
      }
    }
  }, [currentChatId]);

  const handleSelectChat = useCallback((chatId) => {
    setCurrentChatId(chatId);
  }, []);

  const handleDeleteChat = useCallback(async (chatId) => {
    try {
      // Call backend to clear messages for this chat
      const response = await fetch(`${API_BASE_URL}/messages/clear/${chatId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update frontend state to clear messages for this chat
        setChatHistory(prev =>
          prev.filter(chat => chat.id !== chatId)
        );

        // Show success notification
        toast.success("Chat messages cleared", {
          description: "All messages in this chat have been deleted.",
        });
      } else {
        console.error('Failed to clear chat messages on backend');
        toast.error("Failed to clear messages", {
          description: "There was an error clearing the chat messages. Please try again.",
        });
        // Still update frontend state as fallback
        setChatHistory(prev =>
          prev.map(chat =>
            chat.id === chatId
              ? { ...chat, messages: [], updatedAt: new Date() }
              : chat
          )
        );
      }
    } catch (error) {
      console.error('Error clearing chat messages:', error);
      toast.error("Network error", {
        description: "Unable to clear chat messages. Please check your connection.",
      });
      // Still update frontend state as fallback
      setChatHistory(prev =>
        prev.map(chat =>
          chat.id === chatId
            ? { ...chat, messages: [], updatedAt: new Date() }
            : chat
        )
      );
    }
  }, []);

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

  // Export current conversation to markdown
  const handleExportConversation = useCallback(() => {
    const currentChat = getCurrentChat();
    console.log("currentChat", currentChat);
    if (!currentChat || currentChat.messages.length === 0) {
      toast.error("No conversation to export", {
        description: "Start a conversation before exporting.",
      });
      return;
    } 

    // Generate markdown content
    const timestamp = new Date().toLocaleDateString();
    let markdown = `# Conversation\n\n`;
    markdown += `**Exported on:** ${timestamp}\n\n`;
    markdown += `**Total Messages:** ${currentChat.messages.length}\n\n`;
    markdown += `---\n\n`;

    currentChat.messages.forEach((message, index) => {
      const role = message.role === 'human' ? '**You**' : '**AI Assistant**';
      const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : '';
      
      markdown += `## ${role} ${time ? `(${time})` : ''}\n\n`;
      markdown += `${message.content}\n\n`;
      
      if (index < currentChat.messages.length - 1) {
        markdown += `---\n\n`;
      }
    });

    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation-${currentChat.id}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Conversation exported", {
      description: "Your conversation has been downloaded as a markdown file.",
    });
  }, [currentChatId, chatHistory]);

  return (
    <div className="App">
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={4000}
      />
      <TokenUsageProvider>
        {isLoadingMessages ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p>Loading conversations...</p>
          </div>
        ) : (
          <AppContainer
            onClearConversation={handleClearConversation}
            onNewChat={handleNewChat}
            onExportConversation={handleExportConversation}
            chatHistory={chatHistory}
            currentChatId={currentChatId}
            currentChat={getCurrentChat()}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
          >
            <ChatInterface
              currentChat={getCurrentChat()}
              onUpdateMessages={updateCurrentChatMessages}
            />
          </AppContainer>
        )}
      </TokenUsageProvider>
    </div>
  );
}

export default App;
