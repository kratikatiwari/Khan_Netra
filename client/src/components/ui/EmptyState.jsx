import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ icon: Icon = FiInbox, title = 'No data found', message = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-coal-800 border border-coal-700/60 flex items-center justify-center mb-4">
        <Icon size={26} className="text-coal-600" />
      </div>
      <h3 className="text-base font-bold text-coal-400 mb-1">{title}</h3>
      {message && <p className="text-sm text-coal-600 mb-5 max-w-xs">{message}</p>}
      {action}
    </div>
  );
}
