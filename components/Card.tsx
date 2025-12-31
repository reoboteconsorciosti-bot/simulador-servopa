
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, title, action, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 sm:gap-0">
          {title && <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
