import clsx from 'clsx';

const MAP = {
  red:    'badge-red',
  yellow: 'badge-yellow',
  green:  'badge-green',
  blue:   'badge-blue',
  gray:   'badge-gray',
  orange: 'badge-orange',
  purple: 'badge-purple',
  teal:   'badge-teal',
};

const DOT_COLOR = {
  red: 'bg-danger-400', yellow: 'bg-amber-400', green: 'bg-success-400',
  blue: 'bg-info-400', gray: 'bg-coal-500', orange: 'bg-safety-400',
  purple: 'bg-purple-400', teal: 'bg-teal-400',
};

export default function Badge({ children, color = 'gray', className = '', dot = false }) {
  return (
    <span className={clsx(MAP[color] || 'badge-gray', className)}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', DOT_COLOR[color] || 'bg-coal-500')} />}
      {children}
    </span>
  );
}
