import clsx from 'clsx';

function scoreColor(s) {
  if (s >= 80) return { text: 'text-success-400', bar: 'bg-success-500' };
  if (s >= 60) return { text: 'text-amber-400',   bar: 'bg-amber-500' };
  return             { text: 'text-danger-400',   bar: 'bg-danger-500' };
}

export default function ScoreBar({ score, label, showLabel = true, height = 'h-1.5' }) {
  const pct = Math.min(100, Math.max(0, parseFloat(score) || 0));
  const { text, bar } = scoreColor(pct);
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-[11px] text-coal-500">{label}</span>}
          <span className={clsx('text-[11px] font-bold', text)}>{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className={clsx('score-bar-track', height)}>
        <div className={clsx('score-bar-fill', bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
