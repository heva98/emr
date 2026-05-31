import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsService } from '../../../services/roomsService';

const ROOM_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'LAB_BENCH', label: 'Lab Bench' },
  { value: 'DISPENSING', label: 'Dispensing' },
  { value: 'CASHIER_DESK', label: 'Cashier Desk' },
  { value: 'WARD_BED', label: 'Ward Bed' },
  { value: 'STORE', label: 'Store' },
  { value: 'OTHER', label: 'Other' },
];

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';
const lbl = 'block text-xs font-medium text-gray-600 mb-1';

const EMPTY_FORM = {
  room_number: '',
  room_name: '',
  department: '',
  room_type: 'CONSULTATION',
  floor: '',
  capacity: 1,
};

export default function RoomFormModal({ room, departments, onClose, onSuccess }) {
  const isEdit = Boolean(room);
  const [form, setForm] = useState(
    isEdit
      ? {
          room_number: room.room_number,
          room_name: room.room_name,
          department: room.department,
          room_type: room.room_type,
          floor: room.floor,
          capacity: room.capacity,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.department) {
      toast.error('Please select a department.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await roomsService.updateRoom(room.id, form);
        toast.success('Room updated.');
      } else {
        await roomsService.createRoom(form);
        toast.success('Room created.');
      }
      onSuccess();
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.room_number?.[0] ||
        data?.non_field_errors?.[0] ||
        data?.detail ||
        'Failed to save room.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            {isEdit ? `Edit Room ${room.room_number}` : 'Add New Room'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Room number + name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Room Number</label>
              <input
                className={inp}
                placeholder="e.g. 101"
                value={form.room_number}
                onChange={set('room_number')}
                required
              />
            </div>
            <div>
              <label className={lbl}>Capacity</label>
              <input
                type="number"
                min="1"
                className={inp}
                value={form.capacity}
                onChange={set('capacity')}
                required
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Room Name</label>
            <input
              className={inp}
              placeholder="e.g. Dr. Amina's Consultation Room"
              value={form.room_name}
              onChange={set('room_name')}
              required
            />
          </div>

          {/* Department */}
          <div>
            <label className={lbl}>Department</label>
            {departments.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                No departments found. Create one first on the Departments page.
              </p>
            ) : (
              <select
                className={inp}
                value={form.department}
                onChange={set('department')}
                required
              >
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Room type */}
          <div>
            <label className={lbl}>Room Type</label>
            <select className={inp} value={form.room_type} onChange={set('room_type')} required>
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Floor */}
          <div>
            <label className={lbl}>Floor</label>
            <input
              className={inp}
              placeholder="e.g. Ground, 1st, 2nd"
              value={form.floor}
              onChange={set('floor')}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || departments.length === 0}
              className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium
                         hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving…' : isEdit ? 'Update Room' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
