import React from 'react';

interface NotificationBarProps {
  message: string;
  color?: string;
  onClose?: () => void;
}

export const NotificationBar: React.FC<NotificationBarProps> = ({ message, color = 'bg-yellow-500', onClose }) => (
  <div
    className={`fixed top-0 left-0 w-full z-50 flex items-center justify-center p-4 ${color} text-white font-bold shadow-lg animate-fade-in-down`}
    style={{ minHeight: 48 }}
  >
    <span>{message}</span>
    {onClose && (
      <button
        className="ml-4 px-2 py-1 bg-black/30 rounded hover:bg-black/50 transition-colors"
        onClick={onClose}
      >
        ×
      </button>
    )}
  </div>
);

// Add a simple fade-in-down animation
// Add this to your global CSS if not present:
// @keyframes fade-in-down { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
// .animate-fade-in-down { animation: fade-in-down 0.4s ease; }
