const STATUS_CONFIG = {
  WAITING:           { label: 'Waiting',          cls: 'bg-yellow-100 text-yellow-800' },
  TRIAGE_DONE:       { label: 'Triage Done',       cls: 'bg-blue-100 text-blue-800' },
  WITH_DOCTOR:       { label: 'With Doctor',       cls: 'bg-purple-100 text-purple-800' },
  LAB_PENDING:       { label: 'Lab Pending',       cls: 'bg-indigo-100 text-indigo-800' },
  PHARMACY_PENDING:  { label: 'Pharmacy',          cls: 'bg-orange-100 text-orange-800' },
  BILLING_PENDING:   { label: 'Billing',           cls: 'bg-red-100 text-red-700' },
  COMPLETED:         { label: 'Completed',         cls: 'bg-green-100 text-green-800' },
  CANCELLED:         { label: 'Cancelled',         cls: 'bg-gray-100 text-gray-500' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
