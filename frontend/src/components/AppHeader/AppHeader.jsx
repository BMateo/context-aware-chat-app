import React from "react";
import { Button } from "../ui/button";
import { X, Plus, Menu, Download } from "lucide-react";
import styles from "./AppHeader.module.css";

export default function AppHeader({ 
  onClearConversation, 
  onNewChat, 
  onExportConversation,
  currentChat,
  onToggleSidebar, 
  isMobile 
}) {
  const hasMessages = currentChat && currentChat.messages && currentChat.messages.length > 0;

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {isMobile && (
          <Button variant="ghost" size="sm" className={styles.menuButton} onClick={onToggleSidebar}>
            <Menu className={styles.menuIcon} />
          </Button>
        )}
        <h1 className={styles.title}>Your Context Aware Chatbot</h1>
      </div>
      <div className={styles.actions}>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onExportConversation}
          disabled={!hasMessages}
          title="Export conversation as markdown"
        >
          <Download className={styles.actionIcon} />
          <span className={styles.buttonText}>Export</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onNewChat}>
          <Plus className={styles.actionIcon} />
          <span className={styles.buttonText}>New chat</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearConversation}>
          <X className={styles.closeIcon} />
          <span className={styles.buttonText}>Clear conversation</span>
        </Button>
      </div>
    </header>
  );
}
