import React from 'react';
import styles from './ScrollArea.module.css';
import { cn } from '../../../lib/utils';

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      className={cn(styles.scrollArea, className)}
      ref={ref}
      {...props}
    >
      <div className={styles.viewport}>
        {children}
      </div>
    </div>
  );
});

ScrollArea.displayName = "ScrollArea";

export { ScrollArea }; 