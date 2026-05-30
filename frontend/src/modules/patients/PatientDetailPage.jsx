import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Pencil, PlusCircle, Phone, Calendar, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientService } from '../../services/patientService';
import InitialsAvatar from './components/InitialsAvatar';
import StatusBadge from './components/StatusBadge';

const BLOOD_GROUP_LABELS = {
  A_POS: 'A+', A_NEG: 'A-', B_POS: 'B+', B_NEG: 'B-',
  AB_POS: 'AB+', AB_NEG: 'AB-', O_POS: 'O+', O_NEG: 'O-', UNKNOWN: 'Unknown',
};
const GENDER_LABELS = { M: 'Male', F: 'Female', OTHER: 'Other' };
const VISIT_TYPE_LABELS = { OPD: 'OPD', EMERGENCY: 'Emergency', FOLLOW_UP: 'Follow-Up' };

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Patient Header ──────────────────────────────────────────────────────────

function PatientHeader({ patient }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
      <InitialsAvatar
        firstName={patient.first_name}
        lastName={patient.last_name}
        photoUrl={patient.photo}
        size="lg"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
            {patient.patient_id}
          </span>
          {!patient.is_active && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">Inactive</span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 truncate">{patient.full_name}</h1>

        <div className="flex flex-wrap gap-2 mt-2">
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
            {patient.age} yrs · {GENDER_LABELS[patient.gender] ?? patient.gender}
          </span>
          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
            {BLOOD_GROUP_LABELS[patient.blood_group] ?? patient.blood_group}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            {patient.phone_primary}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Registered {fmt(patient.created_at)}
          </span>
        </div>
      </div>

      <button
        onClick={() => navigate(`/registration/${patient.id}/edit`)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
      >
        <Pencil className="w-4 h-4" />
        Edit Patient
      </button>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ patient }) {
  function Row({ label, value }) {
    return (
      <div className="py-2 border-b border-gray-50 last:border-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-800 mt-0.5">{value || <span className="text-gray-400">—</span>}</p>
      </div>
    );
  }

  function Section({ title, children }) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
        <div className="bg-gray-50 rounded-lg px-4 py-1">{children}</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-5">
        <Section title="Personal">
          <Row label="Full Name" value={patient.full_name} />
          <Row label="Date of Birth" value={`${patient.date_of_birth} (${patient.age} years)`} />
          <Row label="Gender" value={GENDER_LABELS[patient.gender]} />
          <Row label="National ID" value={patient.national_id} />
        </Section>
        <Section title="Contact">
          <Row label="Primary Phone" value={patient.phone_primary} />
          <Row label="Secondary Phone" value={patient.phone_secondary} />
          <Row label="Email" value={patient.email} />
        </Section>
        <Section title="Next of Kin">
          <Row label="Name" value={patient.next_of_kin_name} />
          <Row label="Phone" value={patient.next_of_kin_phone} />
          <Row label="Relationship" value={patient.next_of_kin_relationship} />
        </Section>
      </div>

      <div className="space-y-5">
        <Section title="Address">
          <Row label="Street / Area" value={patient.address_street} />
          <Row label="City" value={patient.address_city} />
          <Row label="District" value={patient.address_district} />
          <Row label="Region" value={patient.address_region} />
        </Section>
        <Section title="Medical">
          <Row label="Blood Group" value={BLOOD_GROUP_LABELS[patient.blood_group]} />
          <Row label="Allergies" value={patient.allergies} />
          <Row label="Chronic Conditions" value={patient.chronic_conditions} />
        </Section>
        <Section title="Registration">
          <Row label="Registered By" value={patient.registered_by_name} />
          <Row label="Registered On" value={fmt(patient.created_at)} />
          <Row label="Total Visits" value={String(patient.visits_count ?? 0)} />
        </Section>
      </div>
    </div>
  );
}

// ─── Visits Tab ──────────────────────────────────────────────────────────────

function NewVisitModal({ patientId, onClose, onCreated }) {
  const navigate = useNavigate();
  const [visitType, setVisitType] = useState('OPD');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setSubmitting(true);
    try {
      await patientService.createVisit(patientId, { visit_type: visitType });
      toast.success('Visit started');
      onCreated();
      navigate('/opd');
    } catch {
      toast.error('Failed to create visit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Start New Visit</h2>

        <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type</label>
        <div className="space-y-2 mb-6">
          {[
            { value: 'OPD', label: 'OPD', desc: 'Regular outpatient appointment' },
            { value: 'EMERGENCY', label: 'Emergency', desc: 'Urgent / emergency case' },
            { value: 'FOLLOW_UP', label: 'Follow-Up', desc: 'Review of previous treatment' },
          ].map(({ value, label, desc }) => (
            <label
              key={value}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                visitType === value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value={value}
                checked={visitType === value}
                onChange={(e) => setVisitType(e.target.value)}
                className="accent-primary mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {submitting && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Start Visit
          </button>
        </div>
      </div>
    </div>
  );
}

function VisitsTab({ patientId }) {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    patientService
      .listVisits(patientId)
      .then(({ data }) => setVisits(data))
      .catch(() => toast.error('Failed to load visits'))
      .finally(() => setLoading(false));
  }, [patientId]);

  function handleCreated() {
    setShowModal(false);
    setLoading(true);
    patientService
      .listVisits(patientId)
      .then(({ data }) => setVisits(data))
      .finally(() => setLoading(false));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{visits.length} visit{visits.length !== 1 ? 's' : ''} on record</p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Start New Visit
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No visits recorded yet</div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Visit #', 'Date', 'Type', 'Status', 'Created By', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visits.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{v.visit_number}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(v.visit_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{VISIT_TYPE_LABELS[v.visit_type] ?? v.visit_type}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{v.created_by_name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/opd?visit=${v.id}`)}
                      title="View visit"
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <NewVisitModal
          patientId={patientId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}

// ─── Placeholder Tab ──────────────────────────────────────────────────────────

function PlaceholderTab({ phase, module }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <span className="text-lg">🔒</span>
      </div>
      <p className="text-sm font-medium text-gray-600">Coming in Phase {phase}</p>
      <p className="text-xs text-gray-400 mt-1">{module} module is under development</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',       label: 'Overview' },
  { id: 'visits',         label: 'Visits' },
  { id: 'lab',            label: 'Lab Results' },
  { id: 'prescriptions',  label: 'Prescriptions' },
  { id: 'billing',        label: 'Billing' },
];

export default function PatientDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  useEffect(() => {
    patientService
      .get(id)
      .then(({ data }) => setPatient(data))
      .catch(() => {
        toast.error('Patient not found');
        navigate('/registration');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="space-y-4">
      <PatientHeader patient={patient} />

      {/* Tab navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200 px-4 overflow-x-auto">
          <nav className="flex gap-0 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview'      && <OverviewTab patient={patient} />}
          {activeTab === 'visits'        && <VisitsTab patientId={id} />}
          {activeTab === 'lab'           && <PlaceholderTab phase={3} module="Laboratory" />}
          {activeTab === 'prescriptions' && <PlaceholderTab phase={4} module="Pharmacy" />}
          {activeTab === 'billing'       && <PlaceholderTab phase={5} module="Cashier / Billing" />}
        </div>
      </div>
    </div>
  );
}
