import Modal from './Modal';
import { FiAlertTriangle } from 'react-icons/fi';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Confirm Action', message, confirmText = 'Confirm', loading = false, danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      }
    >
      <div className="flex gap-4">
        <div className={`p-3 rounded-full shrink-0 ${danger ? 'bg-danger-50' : 'bg-warning-50'}`}>
          <FiAlertTriangle size={24} className={danger ? 'text-danger-600' : 'text-warning-600'} />
        </div>
        <p className="text-coal-700 text-sm leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
