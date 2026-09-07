import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import clsx from 'clsx';

const SIZES = { sm:'max-w-md', md:'max-w-2xl', lg:'max-w-4xl', xl:'max-w-6xl', full:'max-w-[95vw]' };

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-coal-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx(
        'relative bg-coal-900 rounded-2xl border border-coal-700/60 shadow-panel w-full flex flex-col max-h-[90vh] animate-slide-up',
        SIZES[size],
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-coal-700/50 shrink-0">
          <h2 className="text-base font-bold text-coal-100">{title}</h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-coal-600 hover:text-coal-300 hover:bg-coal-800 transition-colors">
            <FiX size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-coal-700/50 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
