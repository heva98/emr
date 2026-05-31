export default function DateRangePicker({ dateFrom, dateTo, onChange, onApply }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-sm text-gray-500">From</label>
      <input
        type="date"
        value={dateFrom}
        max={dateTo}
        onChange={(e) => onChange({ dateFrom: e.target.value, dateTo })}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <label className="text-sm text-gray-500">To</label>
      <input
        type="date"
        value={dateTo}
        min={dateFrom}
        onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        onClick={onApply}
        className="px-4 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-dark transition-colors font-medium"
      >
        Apply
      </button>
    </div>
  );
}
