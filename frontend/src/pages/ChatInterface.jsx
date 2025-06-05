import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { Copy, Download, ThumbsUp, ThumbsDown, MoreHorizontal } from "lucide-react";
import { cn } from "../lib/utils";
import axios from "axios";
import styles from "./ChatInterface.module.css";

export default function ChatInterface({ currentChat, onUpdateMessages }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messages = currentChat?.messages || [];

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "human",
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    const newMessages = [...messages, userMessage];
    onUpdateMessages(newMessages);
    
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Call backend API using axios
      const response = await axios.post("http://localhost:8000/chat", {
        message: userMessage.content,
        chat_id: currentChat?.id || "default"
      });

      let aiResponseContent = "I'm sorry, I couldn't process your request.";
      
      if (response.data && response.data.response) {
        aiResponseContent = response.data.response;
      }

      // Simulate typing delay for better UX
      setTimeout(() => {
        const aiMessage = {
          role: "ai",
          content: aiResponseContent,
          timestamp: new Date().toLocaleTimeString(),
        };
        
        const finalMessages = [...newMessages, aiMessage];
        onUpdateMessages(finalMessages);
        setIsTyping(false);
      }, 1000);

    } catch (error) {
      console.error("Error sending message:", error);
      setTimeout(() => {
        const errorMessage = {
          role: "ai",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toLocaleTimeString(),
        };
        const finalMessages = [...newMessages, errorMessage];
        onUpdateMessages(finalMessages);
        setIsTyping(false);
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className={styles.container}>
      <ScrollArea className={styles.scrollArea}>
        <div className={styles.messagesContainer}>
          {messages.length === 0 && !isTyping && (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>Start a conversation with the AI assistant</p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                styles.messageWrapper,
                message.role === "human" && styles.messageWrapperUser
              )}
            >
              {message.role === "ai" && (
                <div className={styles.avatar} />
              )}
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <span className={styles.userName}>
                    {message.role === "ai" ? "GenerativeAgent" : "You"}
                  </span>
                  <span className={styles.timestamp}>
                    {message.timestamp}
                  </span>
                </div>
                <div
                  className={cn(
                    styles.messageBubble,
                    message.role === "human" ? styles.messageBubbleUser : styles.messageBubbleAi
                  )}
                >
                  <p className={styles.messageText}>
                    {message.content}
                  </p>
                </div>
                {message.role === "ai" && (
                  <div className={styles.actionButtons}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={styles.actionButton}
                      onClick={() => handleCopyMessage(message.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className={styles.actionButton}>
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className={styles.actionButton}>
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className={styles.actionButton}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className={styles.typingIndicator}>
              <div className={styles.avatar} />
              <div className={styles.typingBubble}>
                <div className={styles.typingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className={styles.inputSection}>
        <div className={styles.inputContainer}>
          <Textarea
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className={styles.textarea}
            disabled={isLoading}
          />
          <Button 
            className={styles.sendButton} 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
