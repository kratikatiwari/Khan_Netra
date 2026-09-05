import clsx from 'clsx';

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-coal-200 border-t-primary-600', sizes[size], className)} />
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-coal-500 text-sm">{message}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="skeleton h-8 flex-1" />
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
          <div className="skeleton h-4 w-1/2 mb-3" />
          <div className="skeleton h-8 w-3/4 mb-2" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
