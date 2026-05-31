const CONFIG = {
  NORMAL:        { label: 'Normal',        cls: 'bg-green-100 text-green-700' },
  LOW:           { label: 'Low',           cls: 'bg-amber-100 text-amber-700' },
  HIGH:          { label: 'High',          cls: 'bg-amber-100 text-amber-700' },
  CRITICAL_LOW:  { label: 'Critical Low',  cls: 'bg-red-100 text-red-700 font-bold' },
  CRITICAL_HIGH: { label: 'Critical High', cls: 'bg-red-100 text-red-700 font-bold' },
  POSITIVE:      { label: 'Positive',      cls: 'bg-blue-100 text-blue-700' },
  NEGATIVE:      { label: 'Negative',      cls: 'bg-gray-100 text-gray-600' },
  NOT_DONE:      { label: 'Not Done',      cls: 'bg-gray-100 text-gray-400' },
};

export const isCritical = (flag) => flag === 'CRITICAL_LOW' || flag === 'CRITICAL_HIGH';

export default function FlagBadge({ flag }) {
  const cfg = CONFIG[flag] ?? { label: flag, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
