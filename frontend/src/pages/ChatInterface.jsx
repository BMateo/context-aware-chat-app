import { useEffect, useState, useRef } from "react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Copy,
  Download,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Upload,
  FileText,
} from "lucide-react";
import { cn } from "../lib/utils";
import styles from "./ChatInterface.module.css";

export default function ChatInterface({ currentChat, onUpdateMessages }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contextReady, setContextReady] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const lastUserMessageRef = useRef(null);

  const messages = currentChat?.messages || [];

  // Auto-scroll to bottom when selecting a new chat
  useEffect(() => {
    // Scroll to bottom when a new chat is selected to show the most recent conversation
    if (currentChat && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Fetch initial health status when component mounts
  useEffect(() => {
    fetchHealthStatus();
  }, []);

  // Remove health stream logic and replace with simple fetch
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch("http://localhost:8000/health");
      const healthData = await response.json();
      setHealthStatus(healthData);
      setContextReady(healthData.context_provider_ready);
    } catch (error) {
      console.error("Error fetching health status:", error);
      // Set default state on error
      setHealthStatus({
        context_provider_ready: false,
        pdf_loaded: false,
        chunks_count: 0,
        message: "Unable to connect to server"
      });
      setContextReady(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  };

  const scrollToUserMessage = () => {
    if (lastUserMessageRef.current) {
      lastUserMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start", // Position at the top of the viewport
        inline: "nearest",
      });
    }
  };

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

    // Create placeholder AI message that will be updated with streaming content
    const placeholderAiMessage = {
      role: "ai",
      content: "", // Empty content initially
      timestamp: new Date().toLocaleTimeString(),
      isTyping: true, // Add flag to indicate typing state
    };

    const messagesWithPlaceholder = [...newMessages, placeholderAiMessage];
    onUpdateMessages(messagesWithPlaceholder);
    let streamingMessageIndex = messagesWithPlaceholder.length - 1;

    // Scroll to show the user's message at the top of the screen
    setTimeout(() => {
      scrollToUserMessage();
    }, 100);

    try {
      // Create EventSource for streaming
      const eventSource = new EventSource(
        `http://localhost:8000/chat/stream?message=${encodeURIComponent(
          userMessage.content
        )}&chat_id=${encodeURIComponent(currentChat?.id || "default")}`
      );

      let accumulatedContent = "";

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "content") {
            accumulatedContent += data.content;

            // Update the AI message with streaming content
            const updatedMessages = [...messagesWithPlaceholder];
            updatedMessages[streamingMessageIndex] = {
              ...updatedMessages[streamingMessageIndex],
              content: accumulatedContent,
              isTyping: false, // Remove typing state when content starts
            };
            onUpdateMessages(updatedMessages);
          } else if (data.type === "done") {
            // Streaming complete
            setIsTyping(false);
            eventSource.close();
          } else if (data.type === "error") {
            console.error("Streaming error:", data.error);
            const errorMessage = {
              role: "ai",
              content: "Sorry, I encountered an error. Please try again.",
              timestamp: new Date().toLocaleTimeString(),
              isTyping: false,
            };
            const finalMessages = [...newMessages, errorMessage];
            onUpdateMessages(finalMessages);
            setIsTyping(false);
            eventSource.close();
          }
        } catch (parseError) {
          console.error("Error parsing SSE data:", parseError);
        }
      };

      eventSource.onerror = (event) => {
        console.error("SSE connection error:", event);
        const errorMessage = {
          role: "ai",
          content: "Sorry, I encountered a connection error. Please try again.",
          timestamp: new Date().toLocaleTimeString(),
          isTyping: false,
        };
        const finalMessages = [...newMessages, errorMessage];
        onUpdateMessages(finalMessages);
        setIsTyping(false);
        eventSource.close();
      };
    } catch (error) {
      console.error("Error setting up streaming:", error);
      const errorMessage = {
        role: "ai",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toLocaleTimeString(),
        isTyping: false,
      };
      const finalMessages = [...newMessages, errorMessage];
      onUpdateMessages(finalMessages);
      setIsTyping(false);
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

  const handleCopyMessage = (content, messageIndex) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(messageIndex);

    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setCopiedMessageIndex(null);
    }, 2000);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      alert("Please select a PDF file");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        const sizeInfo = result.file_size_mb
          ? ` (${result.file_size_mb}MB)`
          : "";
        alert(
          `PDF "${file.name}"${sizeInfo} uploaded successfully! The chatbot is now ready with your new document.`
        );
        // Update health status from upload response
        if (result.health_status) {
          setHealthStatus(result.health_status);
          setContextReady(result.health_status.context_provider_ready);
        }
      } else {
        // Handle error response
        const errorMessage = result.detail?.error || result.detail || result.message || "Unknown error";
        alert(`Failed to upload PDF: ${errorMessage}`);
        
        // Update health status from error response if available
        if (result.detail?.health_status) {
          setHealthStatus(result.detail.health_status);
          setContextReady(result.detail.health_status.context_provider_ready);
        }
      }
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("Failed to upload PDF. Please try again.");
      // On network error, keep current state or fetch fresh status
      fetchHealthStatus();
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  return (
    <div className={styles.container}>
      <ScrollArea className={styles.scrollArea} ref={scrollAreaRef}>
        <div className={styles.messagesContainer}>
          {messages.length === 0 && !isTyping && (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>
                {contextReady
                  ? "Start a conversation with the AI assistant about your uploaded document"
                  : "Upload a PDF file below to start chatting with the AI assistant"}
              </p>
            </div>
          )}
          {messages.map((message, index) => {
            const isLastUserMessage =
              message.role === "human" &&
              (index === messages.length - 1 ||
                (index === messages.length - 2 &&
                  messages[messages.length - 1].role === "ai"));

            return (
              <div
                key={index}
                ref={isLastUserMessage ? lastUserMessageRef : null}
                className={cn(
                  styles.messageWrapper,
                  message.role === "human" && styles.messageWrapperUser
                )}
              >
                {message.role === "ai" && <div className={styles.avatar} />}
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
                      message.role === "human"
                        ? styles.messageBubbleUser
                        : styles.messageBubbleAi
                    )}
                  >
                    {message.role === "ai" &&
                    message.isTyping &&
                    !message.content ? (
                      <div className={styles.typingDots}>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      <p className={styles.messageText}>{message.content}</p>
                    )}
                  </div>
                  {message.role === "ai" && message.content && (
                    <div className={styles.actionButtons}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          styles.actionButton,
                          copiedMessageIndex === index && styles.copiedButton
                        )}
                        onClick={() =>
                          handleCopyMessage(message.content, index)
                        }
                      >
                        {copiedMessageIndex === index ? (
                          <span className={styles.copiedText}>✓</span>
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className={styles.inputSection}>
        {/* Status indicator */}
        {healthStatus && !contextReady && (
          <div className={styles.statusIndicator}>
            <div className={cn(styles.statusDot, styles.statusNotReady)} />
            <span className={styles.statusText}>
              {"Please upload a PDF file to start chatting"}
            </span>
          </div>
        )}

        <div className={styles.inputContainer}>
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf"
            style={{ display: "none" }}
          />

          {/* PDF Upload Button */}
          <Button
            variant="outline"
            size="icon"
            className={styles.uploadButton}
            onClick={handleFileUpload}
            disabled={isUploading || isTyping}
            title="Upload PDF"
          >
            {isUploading ? (
              <div className={styles.spinner} />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>

          <Textarea
            placeholder={
              contextReady
                ? "Type a message..."
                : "Please wait for PDF to load..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className={styles.textarea}
            disabled={isLoading || !contextReady || isTyping}
          />
          <Button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !contextReady || isTyping}
          >
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
