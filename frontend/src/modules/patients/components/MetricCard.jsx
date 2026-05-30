export default function MetricCard({ icon: Icon, label, value, color = 'text-primary' }) {
  const isLoading = value === null || value === undefined;
  return (
    <div className="bg-white rounded-lg shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-full bg-gray-100 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">
          {isLoading ? (
            <span className="inline-block w-16 h-7 bg-gray-200 animate-pulse rounded" />
          ) : (
            value
          )}
        </p>
      </div>
    </div>
  );
}
