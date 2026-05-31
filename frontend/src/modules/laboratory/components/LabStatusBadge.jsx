const CONFIG = {
  ORDERED:            { label: 'Ordered',            cls: 'bg-yellow-100 text-yellow-800' },
  SPECIMEN_COLLECTED: { label: 'Specimen Collected',  cls: 'bg-blue-100 text-blue-800' },
  PROCESSING:         { label: 'Processing',          cls: 'bg-indigo-100 text-indigo-800' },
  RESULTED:           { label: 'Resulted',            cls: 'bg-orange-100 text-orange-800' },
  VERIFIED:           { label: 'Verified',            cls: 'bg-green-100 text-green-800' },
  CANCELLED:          { label: 'Cancelled',           cls: 'bg-gray-100 text-gray-500' },
};

export default function LabStatusBadge({ status }) {
  const cfg = CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
