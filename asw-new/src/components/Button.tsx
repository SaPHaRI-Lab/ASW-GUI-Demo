import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'light-blue';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'medium', 
  className = '', 
  children, 
  ...props 
}) => {
  const baseClasses = 'btn-component';
  
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-light-blue',
    danger: 'btn-danger',
    'light-blue': 'btn-light-blue'
  }[variant];
  
  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'small':
        return {
          fontSize: '12px',
          padding: '8px 12px'
        };
      case 'medium':
        return {
          fontSize: '14px',
          padding: '10px 16px'
        };
      case 'large':
        return {
          fontSize: '16px',
          padding: '12px 20px'
        };
      default:
        return {
          fontSize: '14px',
          padding: '10px 16px'
        };
    }
  };
  
  const classes = `${baseClasses} ${variantClass} ${className}`;
  
  return (
    <button 
      className={classes} 
      style={getSizeStyles(size)}
      {...props}
    >
      {children}
    </button>
  );
};
