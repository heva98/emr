import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, X, ArrowLeft, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { cashierService } from '../../services/cashierService';
import { fmtTZS } from './utils';

const SERVICE_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'LAB',          label: 'Laboratory'    },
  { value: 'PHARMACY',     label: 'Pharmacy'      },
  { value: 'PROCEDURE',    label: 'Procedure'     },
  { value: 'OTHER',        label: 'Other'         },
];

const TYPE_COLORS = {
  CONSULTATION: 'bg-purple-100 text-purple-700',
  LAB:          'bg-amber-100 text-amber-700',
  PHARMACY:     'bg-green-100 text-green-700',
  PROCEDURE:    'bg-blue-100 text-blue-700',
  OTHER:        'bg-gray-100 text-gray-600',
};

const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

function TypeBadge({ type }) {
  const label = SERVICE_TYPES.find((t) => t.value === type)?.label ?? type;
  const cls = TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Inline price editor ───────────────────────────────────────────────────────
function PriceCell({ service, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(service.unit_price));

  const commit = async () => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) { setVal(String(service.unit_price)); setEditing(false); return; }
    if (n !== service.unit_price) {
      await onSave(service.id, { unit_price: n });
    }
    setEditing(false);
  };

  const cancel = () => { setVal(String(service.unit_price)); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          className={`${inp} w-32 text-right`}
        />
        <button onClick={commit} className="text-green-600 hover:text-green-700">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to edit price"
      className="text-left font-medium text-gray-800 hover:text-primary hover:underline transition-colors text-sm"
    >
      {fmtTZS(service.unit_price)}
    </button>
  );
}

// ── Toggle active ─────────────────────────────────────────────────────────────
function ActiveToggle({ service, onToggle }) {
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    setSaving(true);
    try {
      await onToggle(service.id, { is_active: !service.is_active });
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={saving}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        service.is_active ? 'bg-primary' : 'bg-gray-300'
      } ${saving ? 'opacity-60' : ''}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          service.is_active ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ── Add new service form ──────────────────────────────────────────────────────
function AddServiceRow({ onAdded }) {
  const [form, setForm] = useState({ name: '', service_type: 'CONSULTATION', unit_price: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.unit_price) return;
    setSaving(true);
    try {
      await onAdded({
        name: form.name.trim(),
        service_type: form.service_type,
        unit_price: parseInt(form.unit_price, 10),
      });
      setForm({ name: '', service_type: 'CONSULTATION', unit_price: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-primary/5 border-t-2 border-primary/20">
      <td className="px-4 py-3">
        <input
          type="text"
          placeholder="Service name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className={`${inp} w-full`}
          required
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={form.service_type}
          onChange={(e) => setForm((p) => ({ ...p, service_type: e.target.value }))}
          className={`${inp} w-full`}
        >
          {SERVICE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min="0"
          placeholder="0"
          value={form.unit_price}
          onChange={(e) => setForm((p) => ({ ...p, unit_price: e.target.value }))}
          className={`${inp} w-36 text-right`}
          required
        />
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs text-gray-400">Active</span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleSubmit}
          disabled={saving || !form.name.trim() || !form.unit_price}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {saving ? 'Adding…' : 'Add Service'}
        </button>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ServiceCatalogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await cashierService.getCatalog();
      setServices(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load service catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Guard: admin only
  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleUpdate = async (id, data) => {
    try {
      const res = await cashierService.updateService(id, data);
      setServices((prev) => prev.map((s) => (s.id === id ? res.data : s)));
      toast.success('Service updated.');
    } catch {
      toast.error('Failed to update service.');
      load();
    }
  };

  const handleAdd = async (data) => {
    try {
      const res = await cashierService.createService(data);
      setServices((prev) => [...prev, res.data]);
      toast.success('Service added.');
    } catch {
      toast.error('Failed to add service.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/cashier')}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Tag className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-gray-800">Service Catalog</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-10 bg-gray-50 border-b border-gray-100" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50">
                <div className="h-4 bg-gray-200 rounded w-40" />
                <div className="h-5 bg-gray-200 rounded-full w-20" />
                <div className="h-4 bg-gray-200 rounded w-24 ml-auto" />
                <div className="h-5 bg-gray-200 rounded-full w-8" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Price (TZS)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-xs">
                    No services yet. Add your first service below.
                  </td>
                </tr>
              ) : (
                services.map((svc) => (
                  <tr key={svc.id} className={`hover:bg-gray-50 transition-colors ${!svc.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{svc.name}</td>
                    <td className="px-4 py-3">
                      <TypeBadge type={svc.service_type} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PriceCell service={svc} onSave={handleUpdate} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ActiveToggle service={svc} onToggle={handleUpdate} />
                    </td>
                    <td className="px-2 py-3" />
                  </tr>
                ))
              )}

              {/* Add new row at bottom */}
              <AddServiceRow onAdded={handleAdd} />
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
