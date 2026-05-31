const CONFIG = {
  PENDING:              { label: 'Pending',             cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  PARTIALLY_DISPENSED:  { label: 'Partial',             cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  DISPENSED:            { label: 'Dispensed',           cls: 'bg-green-100 text-green-800 border-green-200' },
  CANCELLED:            { label: 'Cancelled',           cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function RxStatusBadge({ status }) {
  const cfg = CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
