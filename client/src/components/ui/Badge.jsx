import clsx from 'clsx';

const colorMap = {
  red: 'bg-red-50 text-red-700 ring-1 ring-red-500/20',
  yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-500/20',
  green: 'bg-green-50 text-green-700 ring-1 ring-green-500/20',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/20',
  gray: 'bg-gray-100 text-gray-600',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-500/20',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-500/20',
  teal: 'bg-teal-50 text-teal-700 ring-1 ring-teal-500/20',
};

export default function Badge({ children, color = 'gray', className = '', dot = false }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold', colorMap[color], className)}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', `bg-${color === 'gray' ? 'gray-400' : color + '-500'}`)} />}
      {children}
    </span>
  );
}
