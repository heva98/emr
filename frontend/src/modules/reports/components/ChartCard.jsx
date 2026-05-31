import LoadingSkeleton from './LoadingSkeleton';

export default function ChartCard({
  title,
  subtitle,
  loading = false,
  error = null,
  height = 320,
  children,
  className = '',
}) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-5 ${
        error ? 'border border-red-300' : ''
      } ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      {loading ? (
        <LoadingSkeleton height={height} />
      ) : error ? (
        <div
          className="flex items-center justify-center text-sm text-red-500"
          style={{ height }}
        >
          {error}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
