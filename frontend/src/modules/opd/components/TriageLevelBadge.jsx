const LEVEL_CONFIG = {
  1: { label: 'L1 · Resuscitation', cls: 'bg-red-600 text-white' },
  2: { label: 'L2 · Emergency',     cls: 'bg-orange-500 text-white' },
  3: { label: 'L3 · Urgent',        cls: 'bg-yellow-400 text-gray-900' },
  4: { label: 'L4 · Semi-urgent',   cls: 'bg-blue-500 text-white' },
  5: { label: 'L5 · Non-urgent',    cls: 'bg-green-500 text-white' },
};

export default function TriageLevelBadge({ level, compact = false }) {
  if (!level) {
    return (
      <span className={`inline-flex items-center rounded-full font-semibold ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      } bg-gray-200 text-gray-500`}>
        Not Triaged
      </span>
    );
  }
  const cfg = LEVEL_CONFIG[level] ?? { label: `L${level}`, cls: 'bg-gray-400 text-white' };
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${
      compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'
    } ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
