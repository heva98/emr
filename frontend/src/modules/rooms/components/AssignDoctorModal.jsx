import { useEffect, useState } from 'react';
import { X, UserRound, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsService } from '../../../services/roomsService';

const SHIFTS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'FULL_DAY', label: 'Full Day' },
];

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';
const lbl = 'block text-xs font-medium text-gray-600 mb-1';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AssignDoctorModal({ room, onClose, onSuccess }) {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    doctor: '',
    shift: 'MORNING',
    assigned_date: todayStr(),
    start_time: '08:00',
    end_time: '14:00',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    roomsService.getDoctors().then((r) => setDoctors(r.data));
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.doctor) {
      toast.error('Please select a doctor.');
      return;
    }
    setSaving(true);
    try {
      await roomsService.createAssignment({ ...form, room: room.id });
      toast.success(`Dr. assigned to ${room.room_number} successfully.`);
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to assign doctor.';
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
          <div>
            <h2 className="text-base font-semibold text-gray-800">Assign Doctor</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {room.room_number} — {room.room_name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Doctor */}
          <div>
            <label className={lbl}>Doctor</label>
            <select className={inp} value={form.doctor} onChange={set('doctor')} required>
              <option value="">— Select doctor —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Shift */}
          <div>
            <label className={lbl}>Shift</label>
            <div className="grid grid-cols-4 gap-2">
              {SHIFTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, shift: s.value }))}
                  className={`text-xs font-medium rounded-lg py-2 border transition-colors ${
                    form.shift === s.value
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={lbl}>Date</label>
            <input
              type="date"
              className={inp}
              value={form.assigned_date}
              onChange={set('assigned_date')}
              required
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Start time</span>
              </label>
              <input type="time" className={inp} value={form.start_time} onChange={set('start_time')} required />
            </div>
            <div>
              <label className={lbl}>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />End time</span>
              </label>
              <input type="time" className={inp} value={form.end_time} onChange={set('end_time')} required />
            </div>
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
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium
                         hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserRound className="w-4 h-4" />
              {saving ? 'Assigning…' : 'Assign Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
