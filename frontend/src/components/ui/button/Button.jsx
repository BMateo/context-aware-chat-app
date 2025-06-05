import React from 'react';
import styles from './Button.module.css';
import { cn } from '../../../lib/utils';

const Button = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "default", 
  children, 
  ...props 
}, ref) => {
  // Map size prop to CSS class name
  const sizeClass = size === "default" ? "defaultSize" : size;

  return (
    <button
      className={cn(
        styles.button,
        styles[variant],
        styles[sizeClass],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button }; 