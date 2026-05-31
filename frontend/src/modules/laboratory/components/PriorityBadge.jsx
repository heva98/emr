const CONFIG = {
  STAT:    { label: 'STAT',    cls: 'bg-red-100 text-red-700 border border-red-200' },
  URGENT:  { label: 'URGENT',  cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  ROUTINE: { label: 'Routine', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
};

export default function PriorityBadge({ priority }) {
  const cfg = CONFIG[priority] ?? { label: priority, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
