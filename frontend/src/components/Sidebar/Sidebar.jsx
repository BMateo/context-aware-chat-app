import React from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { MessageCircle, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import styles from './Sidebar.module.css';

export default function Sidebar({ 
  chatHistory, 
  currentChatId, 
  onSelectChat, 
  onDeleteChat,
  isMobile,
  isOpen,
  onClose
}) {
  const formatChatPreview = (chat) => {
    if (!chat.messages || chat.messages.length === 0) {
      return "New conversation";
    }
    const lastMessage = chat.messages[chat.messages.length - 1];
    return lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? "..." : "");
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleChatSelect = (chatId) => {
    onSelectChat(chatId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && (
        <div 
          className={cn(styles.overlay, isOpen && styles.overlayVisible)}
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        styles.sidebar,
        isMobile && styles.sidebarMobile,
        isMobile && isOpen && styles.sidebarMobileOpen
      )}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logo} />
            <span className={styles.brandName}>Chat History</span>
          </div>
        </div>
        <ScrollArea className={styles.scrollArea}>
          <div className={styles.content}>
            {chatHistory.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageCircle className={styles.emptyIcon} />
                <p className={styles.emptyText}>No conversations yet</p>
              </div>
            ) : (
              <div className={styles.chatList}>
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      styles.chatItem,
                      currentChatId === chat.id && styles.chatItemActive
                    )}
                    onClick={() => handleChatSelect(chat.id)}
                  >
                    <div className={styles.chatContent}>
                      <div className={styles.chatPreview}>
                        {formatChatPreview(chat)}
                      </div>
                      <div className={styles.chatMeta}>
                        <span className={styles.chatDate}>
                          {formatDate(chat.createdAt)}
                        </span>
                        <span className={styles.messageCount}>
                          {chat.messages ? chat.messages.length : 0} messages
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={styles.deleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                    >
                      <Trash2 className={styles.deleteIcon} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
} 