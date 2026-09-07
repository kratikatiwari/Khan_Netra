import clsx from 'clsx';

export function LoadingSpinner({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' }[size];
  return (
    <div className={clsx('rounded-full border-2 border-coal-700 border-t-amber-400 animate-spin', s, className)} />
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-coal-500 text-sm">{message}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="skeleton h-8 flex-1 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          <div className="skeleton h-3 w-1/2 mb-3 rounded" />
          <div className="skeleton h-7 w-3/4 mb-2 rounded" />
          <div className="skeleton h-2 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}
