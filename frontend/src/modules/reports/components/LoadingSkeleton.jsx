export default function LoadingSkeleton({ height = 300 }) {
  return (
    <div
      className="bg-gray-100 animate-pulse rounded-md w-full"
      style={{ height }}
    />
  );
}
