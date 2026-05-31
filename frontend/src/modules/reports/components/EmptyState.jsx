import { BarChart2 } from 'lucide-react';

export default function EmptyState({ message = 'No data for this period', height = 260 }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-gray-300 gap-3"
      style={{ height }}
    >
      <BarChart2 className="w-12 h-12" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
