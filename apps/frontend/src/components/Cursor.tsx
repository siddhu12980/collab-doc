import React from 'react';
import { User } from '../types/user';
import { calculateCursorPosition } from '../utils/cursor';

interface CursorProps {
  user: User;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function Cursor({ user, textareaRef, containerRef }: CursorProps) {
  const { top, left } = calculateCursorPosition(user.position, textareaRef.current, containerRef.current);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        transform: `translate(${left}px, ${top}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      <div className="relative">
        <span 
          className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-2 py-1 rounded"
          style={{ 
            backgroundColor: user.color, 
            color: 'white',
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {user.name}
        </span>
        <div
          className="w-0.5 h-5 animate-pulse"
          style={{ backgroundColor: user.color }}
        />
      </div>
    </div>
  );
}