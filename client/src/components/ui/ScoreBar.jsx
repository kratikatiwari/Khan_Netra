import clsx from 'clsx';
import { scoreToBg, scoreToColor } from '../../utils/helpers';

export default function ScoreBar({ score, label, showLabel = true, height = 'h-2' }) {
  const pct = Math.min(100, Math.max(0, parseFloat(score) || 0));
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-xs text-coal-500">{label}</span>}
          <span className={clsx('text-xs font-bold', scoreToColor(pct))}>{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className={clsx('w-full bg-coal-100 rounded-full overflow-hidden', height)}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', scoreToBg(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
