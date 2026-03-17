import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Trash2, 
  Edit3, 
  X,
} from 'lucide-react';
import { ModalType } from '@/shared/types';


export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

// --- Configuration Maps ---
// Maps different types to their respective icons and Tailwind color classes
const themeConfig: Record<ModalType, { 
  icon: React.ElementType, 
  iconColor: string, 
  iconBg: string, 
  confirmBtn: string,
  focusRing: string
}> = {
  delete: {
    icon: Trash2,
    iconColor: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-500/20',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
    focusRing: 'focus:ring-red-500',
  },
 
  edit: {
    icon: Edit3,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-500/20',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    focusRing: 'focus:ring-blue-500',
  },

  default: {
    icon: CheckCircle,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBg: 'bg-gray-100 dark:bg-gray-700',
    confirmBtn: 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white',
    focusRing: 'focus:ring-gray-500',
  }
};

// --- Modal Component ---
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = 'default',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Small delay to ensure the element is in DOM before triggering transition
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      // Wait for exit animation to complete before unmounting
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isRendered) return null;

  const config = themeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div 
        className={`relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-2xl transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 sm:translate-y-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close Button (Top Right) */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 pb-6 pt-8 sm:p-8 sm:flex sm:items-start">
          {/* Icon Container */}
          <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-12 sm:w-12 ${config.iconBg}`}>
            <Icon className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
          </div>
          
          {/* Content */}
          <div className="mt-4 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <h3 className="text-xl font-semibold leading-6 text-gray-900 dark:text-white" id="modal-title">
              {title}
            </h3>
            <div className="mt-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-8 border-t border-gray-100 dark:border-gray-700/50">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex w-full justify-center rounded-xl border border-transparent px-5 py-2.5 text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 sm:ml-3 sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed ${config.confirmBtn} ${config.focusRing}`}
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="mt-3 inline-flex w-full justify-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 sm:mt-0 sm:w-auto disabled:opacity-50"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};