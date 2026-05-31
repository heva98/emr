const CONFIG = {
  DRAFT:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600'   },
  ISSUED:    { label: 'Issued',    cls: 'bg-blue-100 text-blue-700'   },
  PAID:      { label: 'Paid',      cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700'     },
};

export default function InvoiceStatusBadge({ status }) {
  const { label, cls } = CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
