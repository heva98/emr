const CONFIG = {
  CONSULTATION: { label: 'Consultation', cls: 'bg-purple-100 text-purple-700' },
  LAB:          { label: 'Lab',          cls: 'bg-amber-100 text-amber-700'   },
  PHARMACY:     { label: 'Pharmacy',     cls: 'bg-green-100 text-green-700'   },
  MANUAL:       { label: 'Manual',       cls: 'bg-gray-100 text-gray-600'     },
};

export default function ServiceTypeBadge({ type }) {
  const { label, cls } = CONFIG[type] ?? { label: type, cls: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
