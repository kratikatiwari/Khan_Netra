import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import clsx from 'clsx';

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl', full: 'max-w-[95vw]' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]', sizes[size])}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-coal-200 shrink-0">
          <h2 className="text-lg font-bold text-coal-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-coal-100 text-coal-500 transition-colors">
            <FiX size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {/* Footer */}
        {footer && <div className="p-6 border-t border-coal-200 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
