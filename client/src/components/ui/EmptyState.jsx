import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ icon: Icon = FiInbox, title = 'No data found', message = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 bg-coal-100 rounded-full mb-4">
        <Icon size={32} className="text-coal-400" />
      </div>
      <h3 className="text-lg font-semibold text-coal-700 mb-1">{title}</h3>
      {message && <p className="text-sm text-coal-500 mb-4 max-w-sm">{message}</p>}
      {action}
    </div>
  );
}
