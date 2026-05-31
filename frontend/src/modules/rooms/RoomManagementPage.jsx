import { useCallback, useEffect, useState } from 'react';
import { Building2, DoorOpen, Filter, RefreshCw, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsService } from '../../services/roomsService';
import AssignDoctorModal from './components/AssignDoctorModal';

const ROOM_TYPE_LABELS = {
  CONSULTATION: 'Consultation',
  PROCEDURE: 'Procedure',
  LAB_BENCH: 'Lab Bench',
  DISPENSING: 'Dispensing',
  CASHIER_DESK: 'Cashier Desk',
  WARD_BED: 'Ward Bed',
  STORE: 'Store',
  OTHER: 'Other',
};

const ROOM_TYPE_COLORS = {
  CONSULTATION: 'bg-blue-100 text-blue-700',
  PROCEDURE: 'bg-purple-100 text-purple-700',
  LAB_BENCH: 'bg-teal-100 text-teal-700',
  DISPENSING: 'bg-green-100 text-green-700',
  CASHIER_DESK: 'bg-amber-100 text-amber-700',
  WARD_BED: 'bg-pink-100 text-pink-700',
  STORE: 'bg-gray-100 text-gray-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

const sel = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';

export default function RoomManagementPage() {
  const [rooms, setRooms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignRoom, setAssignRoom] = useState(null);

  const [filterDept, setFilterDept] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterAvail, setFilterAvail] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDept) params.department = filterDept;
      if (filterFloor) params.floor = filterFloor;
      if (filterAvail !== '') params.is_available = filterAvail;

      const [roomsRes, deptsRes] = await Promise.all([
        roomsService.getRooms({ ...params, is_active: 'true' }),
        roomsService.getDepartments(),
      ]);
      setRooms(roomsRes.data.results ?? roomsRes.data);
      setDepartments(deptsRes.data.results ?? deptsRes.data);
    } catch {
      toast.error('Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterFloor, filterAvail]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUnassign = async (assignmentId) => {
    try {
      await roomsService.deactivateAssignment(assignmentId);
      toast.success('Doctor unassigned.');
      fetchData();
    } catch {
      toast.error('Failed to unassign doctor.');
    }
  };

  const floors = [...new Set(rooms.map((r) => r.floor).filter(Boolean))].sort();

  const clearFilters = () => {
    setFilterDept('');
    setFilterFloor('');
    setFilterAvail('');
  };
  const hasFilters = filterDept || filterFloor || filterAvail !== '';

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Room Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} shown
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
          <Filter className="w-4 h-4" />
          Filter:
        </span>

        <select className={sel} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select className={sel} value={filterFloor} onChange={(e) => setFilterFloor(e.target.value)}>
          <option value="">All Floors</option>
          {floors.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <select className={sel} value={filterAvail} onChange={(e) => setFilterAvail(e.target.value)}>
          <option value="">Any Availability</option>
          <option value="true">Available</option>
          <option value="false">Occupied</option>
        </select>

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <RoomGridSkeleton />
      ) : rooms.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onAssign={() => setAssignRoom(room)}
              onUnassign={handleUnassign}
            />
          ))}
        </div>
      )}

      {/* Assign modal */}
      {assignRoom && (
        <AssignDoctorModal
          room={assignRoom}
          onClose={() => setAssignRoom(null)}
          onSuccess={() => { setAssignRoom(null); fetchData(); }}
        />
      )}
    </div>
  );
}

function RoomCard({ room, onAssign, onUnassign }) {
  const [hovered, setHovered] = useState(false);

  const statusPill = room.is_available
    ? 'bg-green-100 text-green-700'
    : 'bg-amber-100 text-amber-700';
  const statusLabel = room.is_available ? 'Available' : 'Occupied';

  return (
    <div
      className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Room number + type */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl font-bold text-gray-800 leading-none">{room.room_number}</span>
        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${ROOM_TYPE_COLORS[room.room_type] ?? 'bg-gray-100 text-gray-600'}`}>
          {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
        </span>
      </div>

      {/* Room name */}
      <p className="text-sm font-medium text-gray-700 leading-tight">{room.room_name}</p>

      {/* Department + floor */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          {room.department_name}
        </span>
        <span className="flex items-center gap-1">
          <DoorOpen className="w-3 h-3" />
          {room.floor}
        </span>
      </div>

      {/* Assigned doctor info */}
      {room.assigned_doctor && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5">
          <UserRound className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{room.assigned_doctor.name}</span>
          <ShiftBadge shift={room.assigned_doctor.shift} />
        </div>
      )}

      {/* Status pill */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${statusPill}`}>
          {statusLabel}
        </span>
      </div>

      {/* Hover overlay actions */}
      {hovered && (
        <div className="absolute inset-x-0 bottom-0 flex rounded-b-xl overflow-hidden">
          {room.is_available ? (
            <button
              onClick={onAssign}
              className="flex-1 py-2.5 text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <UserRound className="w-3.5 h-3.5" />
              Assign Doctor
            </button>
          ) : (
            <button
              onClick={() => room.assigned_doctor && onUnassign(room.assigned_doctor.assignment_id)}
              className="flex-1 py-2.5 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Unassign
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ShiftBadge({ shift }) {
  const colors = {
    MORNING: 'bg-yellow-100 text-yellow-700',
    AFTERNOON: 'bg-orange-100 text-orange-700',
    NIGHT: 'bg-indigo-100 text-indigo-700',
    FULL_DAY: 'bg-blue-100 text-blue-700',
  };
  const labels = { MORNING: 'AM', AFTERNOON: 'PM', NIGHT: 'Night', FULL_DAY: 'Full' };
  return (
    <span className={`ml-auto text-xs rounded px-1.5 py-0.5 font-medium shrink-0 ${colors[shift] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[shift] ?? shift}
    </span>
  );
}

function RoomGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-44 animate-pulse">
          <div className="flex justify-between mb-3">
            <div className="h-8 bg-gray-200 rounded w-14" />
            <div className="h-5 bg-gray-100 rounded-full w-20" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-36 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-24 mb-4" />
          <div className="h-6 bg-gray-200 rounded-full w-20 mt-auto" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
      <DoorOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">
        {hasFilters ? 'No rooms match the current filters.' : 'No rooms found.'}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="mt-2 text-sm text-primary underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
