import React from 'react';
import styles from './MainContainer.module.css';

export default function MainContainer({ children }) {
  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        {children}
      </div>
    </div>
  );
} 