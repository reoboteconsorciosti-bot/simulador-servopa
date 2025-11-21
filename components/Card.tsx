
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, title, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 md:p-6 ${className}`}>
      {title && <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-900 dark:text-white">{title}</h2>}
      {children}
    </div>
  );
};

export default Card;
