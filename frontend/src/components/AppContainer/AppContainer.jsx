import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import MainContainer from '../MainContainer/MainContainer';
import AppHeader from '../AppHeader/AppHeader';
import { cn } from '../../lib/utils';
import styles from './AppContainer.module.css';

export default function AppContainer({ 
  children, 
  onClearConversation, 
  onNewChat,
  onExportConversation,
  chatHistory,
  currentChatId,
  currentChat,
  onSelectChat,
  onDeleteChat
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setSidebarOpen(false); // Close sidebar when switching to desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={cn(
      styles.appContainer,
      isMobile && styles.appContainerMobile
    )}>
      {!isMobile && (
        <Sidebar 
          chatHistory={chatHistory}
          currentChatId={currentChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          isMobile={false}
        />
      )}
      
      {isMobile && (
        <Sidebar 
          chatHistory={chatHistory}
          currentChatId={currentChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          isMobile={true}
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
        />
      )}
      
      <MainContainer>
        <AppHeader 
          onClearConversation={onClearConversation} 
          onNewChat={onNewChat}
          onExportConversation={onExportConversation}
          currentChat={currentChat}
          onToggleSidebar={handleToggleSidebar}
          isMobile={isMobile}
        />
        {children}
      </MainContainer>
    </div>
  );
} 