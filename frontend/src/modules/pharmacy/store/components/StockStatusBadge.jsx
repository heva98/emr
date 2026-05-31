export function getStockStatus(item) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(item.expiry_date);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) return 'EXPIRED';
  if (item.quantity_in_stock === 0) return 'OUT_OF_STOCK';
  if (item.quantity_in_stock <= Math.floor(item.drug_reorder_level * 0.5)) return 'CRITICAL';
  if (item.quantity_in_stock <= item.drug_reorder_level) return 'LOW';
  return 'OK';
}

const CONFIG = {
  OK:           { label: 'OK',          cls: 'bg-green-100 text-green-800 border-green-200' },
  LOW:          { label: 'Low Stock',   cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  CRITICAL:     { label: 'Critical',    cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  OUT_OF_STOCK: { label: 'Out of Stock',cls: 'bg-red-100 text-red-700 border-red-200' },
  EXPIRED:      { label: 'Expired',     cls: 'bg-red-900/10 text-red-900 border-red-300' },
};

export default function StockStatusBadge({ item }) {
  const st = getStockStatus(item);
  const cfg = CONFIG[st];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
