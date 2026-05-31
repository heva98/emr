import { NavLink } from 'react-router-dom';
import { DoorOpen, CalendarDays, Building2 } from 'lucide-react';

const TABS = [
  { to: '/rooms', label: 'Rooms', icon: DoorOpen, end: true },
  { to: '/rooms/assignments', label: 'Assignments', icon: CalendarDays },
  { to: '/rooms/departments', label: 'Departments', icon: Building2 },
];

export default function RoomsNav() {
  return (
    <div className="flex items-center gap-1 bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`
          }
        >
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      ))}
    </div>
  );
}
