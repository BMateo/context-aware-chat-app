import React from "react";
import { Button } from "../ui/button";
import { X, Plus, Menu } from "lucide-react";
import styles from "./AppHeader.module.css";

export default function AppHeader({ onClearConversation, onNewChat, onToggleSidebar, isMobile }) {
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
        <Button variant="ghost" size="sm" onClick={onNewChat}>
          <Plus className={styles.actionIcon} />
          New chat
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearConversation}>
          <X className={styles.closeIcon} />
          Clear conversation
        </Button>
      </div>
    </header>
  );
}
