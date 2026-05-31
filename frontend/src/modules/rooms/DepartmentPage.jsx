import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Trash2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsService } from '../../services/roomsService';

const DEPT_OPTIONS = [
  'OPD', 'LABORATORY', 'PHARMACY', 'RADIOLOGY', 'WARD', 'ADMINISTRATION', 'OTHER',
];

const DEPT_COLORS = {
  OPD: 'bg-blue-100 text-blue-700',
  LABORATORY: 'bg-teal-100 text-teal-700',
  PHARMACY: 'bg-green-100 text-green-700',
  RADIOLOGY: 'bg-purple-100 text-purple-700',
  WARD: 'bg-pink-100 text-pink-700',
  ADMINISTRATION: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

const DEPT_LABELS = {
  OPD: 'OPD',
  LABORATORY: 'Laboratory',
  PHARMACY: 'Pharmacy',
  RADIOLOGY: 'Radiology',
  WARD: 'Ward',
  ADMINISTRATION: 'Administration',
  OTHER: 'Other',
};

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';

export default function DepartmentPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null | department object
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await roomsService.getDepartments();
      setDepartments(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepts(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setShowForm(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm({ name: dept.name, description: dept.description });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await roomsService.updateDepartment(editing.id, form);
        toast.success('Department updated.');
      } else {
        await roomsService.createDepartment(form);
        toast.success('Department created.');
      }
      setShowForm(false);
      fetchDepts();
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to save.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${DEPT_LABELS[dept.name] ?? dept.name}"? This cannot be undone.`)) return;
    try {
      await roomsService.deleteDepartment(dept.id);
      toast.success('Department deleted.');
      fetchDepts();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Cannot delete — rooms may still reference this department.';
      toast.error(msg);
    }
  };

  // Names already used (excluding the one being edited)
  const usedNames = departments
    .filter((d) => !editing || d.id !== editing.id)
    .map((d) => d.name);
  const availableOptions = DEPT_OPTIONS.filter((n) => !usedNames.includes(n));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Departments</h1>
          <p className="text-sm text-gray-400 mt-0.5">{departments.length} department{departments.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          disabled={availableOptions.length === 0 && !editing}
          className="flex items-center gap-1.5 text-sm font-medium bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-primary/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              {editing ? 'Edit Department' : 'New Department'}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <select
                className={inp}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              >
                <option value="">— Select department —</option>
                {editing && <option value={editing.name}>{DEPT_LABELS[editing.name] ?? editing.name}</option>}
                {availableOptions.map((n) => (
                  <option key={n} value={n}>{DEPT_LABELS[n] ?? n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description <span className="text-gray-400">(optional)</span></label>
              <textarea
                className={inp}
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description…"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Departments list */}
      {loading ? (
        <ListSkeleton />
      ) : departments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No departments yet.</p>
          <button onClick={openCreate} className="mt-2 text-sm text-primary underline">Add one</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Department', 'Description', 'Active Rooms', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ${DEPT_COLORS[dept.name] ?? 'bg-gray-100 text-gray-600'}`}>
                      <Building2 className="w-3 h-3" />
                      {DEPT_LABELS[dept.name] ?? dept.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{dept.description || <span className="text-gray-300 italic">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-700">{dept.room_count}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(dept)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary border border-gray-200 rounded-lg px-2.5 py-1 hover:border-primary transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dept)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-10 bg-gray-50 border-b border-gray-100" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-50 last:border-0">
          <div className="h-6 bg-gray-200 rounded-full w-28" />
          <div className="flex-1 h-4 bg-gray-100 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-8" />
          <div className="flex gap-2">
            <div className="h-7 bg-gray-200 rounded-lg w-14" />
            <div className="h-7 bg-gray-100 rounded-lg w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}
