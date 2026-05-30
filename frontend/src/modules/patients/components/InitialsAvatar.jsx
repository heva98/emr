export default function InitialsAvatar({ firstName = '', lastName = '', size = 'md', photoUrl = null }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';
  const sz = size === 'lg' ? 'w-20 h-20 text-2xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        className={`${sz} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div className={`${sz} rounded-full bg-primary text-white flex items-center justify-center font-semibold shrink-0 select-none`}>
      {initials}
    </div>
  );
}
