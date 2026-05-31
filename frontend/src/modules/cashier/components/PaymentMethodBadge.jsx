const CONFIG = {
  CASH:         { label: 'Cash',         cls: 'bg-emerald-100 text-emerald-700' },
  MOBILE_MONEY: { label: 'Mobile Money', cls: 'bg-blue-100 text-blue-700'       },
};

export default function PaymentMethodBadge({ method }) {
  const { label, cls } = CONFIG[method] ?? { label: method, cls: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
