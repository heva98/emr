import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronDown, ChevronUp, AlertTriangle, Printer, Send,
  Search, X, Plus, User, Stethoscope, ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { opdService } from '../../services/opdService';
import StatusBadge from '../patients/components/StatusBadge';
import InitialsAvatar from '../patients/components/InitialsAvatar';

// ── Review of Systems data ────────────────────────────────────────────────────
const ROS_SYSTEMS = [
  { group: 'General',          items: ['Fever', 'Fatigue / Malaise', 'Weight loss', 'Night sweats', 'Chills'] },
  { group: 'Respiratory',      items: ['Cough', 'Shortness of breath', 'Chest tightness', 'Wheezing', 'Haemoptysis'] },
  { group: 'Cardiovascular',   items: ['Chest pain', 'Palpitations', 'Orthopnoea', 'Leg swelling', 'Syncope'] },
  { group: 'Gastrointestinal', items: ['Nausea', 'Vomiting', 'Diarrhoea', 'Constipation', 'Abdominal pain', 'Heartburn'] },
  { group: 'Neurological',     items: ['Headache', 'Dizziness', 'Numbness / Tingling', 'Weakness', 'Seizures'] },
  { group: 'Musculoskeletal',  items: ['Joint pain', 'Back pain', 'Muscle cramps'] },
  { group: 'Genitourinary',    items: ['Dysuria', 'Frequency', 'Haematuria', 'Polyuria'] },
  { group: 'Skin / ENT',       items: ['Rash', 'Itching', 'Sore throat', 'Ear pain', 'Nasal discharge'] },
];

const ALL_ROS_ITEMS = ROS_SYSTEMS.flatMap((s) => s.items);

function parseRosText(text) {
  if (!text) return new Set();
  return new Set(text.split(';').map((s) => s.trim()).filter(Boolean));
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';
const ta  = `${inp} resize-none`;

// ── CollapsibleSection ────────────────────────────────────────────────────────
function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

// ── ICD-10 Typeahead ──────────────────────────────────────────────────────────
function Icd10Typeahead({ selectedCodes, onChange, readOnly }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback((value) => {
    clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await opdService.searchIcd10(value);
        setResults(res.data);
        setOpen(res.data.length > 0);
      } catch { /* silent */ }
    }, 350);
  }, []);

  const handleInput = (e) => {
    setQ(e.target.value);
    search(e.target.value);
  };

  const addCode = (code) => {
    if (!selectedCodes.find((c) => c.code === code.code)) {
      onChange([...selectedCodes, code]);
    }
    setQ('');
    setResults([]);
    setOpen(false);
  };

  const removeCode = (code) => {
    onChange(selectedCodes.filter((c) => c.code !== code));
  };

  return (
    <div className="space-y-2" ref={wrapRef}>
      {/* Selected tags */}
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCodes.map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium rounded-full px-3 py-1"
            >
              <span className="font-bold">{c.code}</span>
              <span className="text-primary/70">· {c.description}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeCode(c.code)}
                  className="ml-1 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {!readOnly && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={handleInput}
            onFocus={() => q && setOpen(results.length > 0)}
            placeholder="Search ICD-10 codes or descriptions…"
            className={`${inp} pl-9`}
          />
          {open && results.length > 0 && (
            <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {results.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => addCode(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-baseline gap-3 border-b border-gray-50 last:border-0"
                >
                  <span className="font-mono font-bold text-xs text-primary shrink-0">{c.code}</span>
                  <span className="text-sm text-gray-700">{c.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ROS Checkboxes ────────────────────────────────────────────────────────────
function ReviewOfSystems({ selected, onChange, readOnly }) {
  const toggle = (item) => {
    const next = new Set(selected);
    next.has(item) ? next.delete(item) : next.add(item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {ROS_SYSTEMS.map((sys) => (
        <div key={sys.group}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{sys.group}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {sys.items.map((item) => (
              <label
                key={item}
                className={`flex items-center gap-2 text-sm cursor-pointer ${readOnly ? 'pointer-events-none' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(item)}
                  onChange={() => toggle(item)}
                  disabled={readOnly}
                  className="rounded accent-primary w-4 h-4 shrink-0"
                />
                <span className={selected.has(item) ? 'text-gray-800 font-medium' : 'text-gray-500'}>
                  {item}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── VitalsDisplay ─────────────────────────────────────────────────────────────
function VitalItem({ label, value, unit }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-bold text-gray-800 mt-0.5">
        {value ?? <span className="text-gray-300">—</span>}
        {value && unit && <span className="text-xs text-gray-400 ml-1 font-normal">{unit}</span>}
      </p>
    </div>
  );
}

// ── Referral Dropdown ─────────────────────────────────────────────────────────
const REFERRAL_OPTIONS = [
  { value: 'LAB',       label: 'Laboratory' },
  { value: 'PHARMACY',  label: 'Pharmacy' },
  { value: 'CASHIER',   label: 'Cashier / Billing' },
  { value: 'RADIOLOGY', label: 'Radiology' },
];

function ReferralDropdown({ consultationId, disabled }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const refer = async (type, label) => {
    setOpen(false);
    setSending(type);
    try {
      await opdService.createReferral({ consultation: consultationId, referred_to: type });
      toast.success(`Referred to ${label}.`);
    } catch {
      toast.error(`Failed to refer to ${label}.`);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled || !consultationId || !!sending}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-primary text-primary rounded-lg hover:bg-primary hover:text-white disabled:opacity-40 transition-colors"
      >
        <Send className="w-4 h-4" />
        {sending ? `Referring…` : 'Refer To'}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[160px] z-30 overflow-hidden">
          {REFERRAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => refer(opt.value, opt.label)}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ConsultationPage() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ctx, setCtx] = useState(null);       // visit context (patient, visit, triage)
  const [consultationId, setConsultationId] = useState(null);
  const [isSignedOff, setIsSignedOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previousVisitsOpen, setPreviousVisitsOpen] = useState(false);

  // ROS and ICD-10 managed outside react-hook-form
  const [rosSelected, setRosSelected] = useState(new Set());
  const [icd10Codes, setIcd10Codes] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      history_of_presenting_illness: '',
      review_of_systems: '',
      examination_findings: '',
      diagnosis_primary: '',
      diagnosis_secondary: '',
      clinical_notes: '',
      plan: '',
      follow_up_date: '',
    },
  });

  // Load visit context on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await opdService.getVisitContext(visitId);
        const data = res.data;
        setCtx(data);

        // Pre-populate form if consultation exists
        if (data.consultation) {
          const c = data.consultation;
          setConsultationId(c.id);
          setIsSignedOff(c.status === 'SIGNED_OFF');
          setIcd10Codes(c.icd10_codes ?? []);
          setRosSelected(parseRosText(c.review_of_systems));
          reset({
            history_of_presenting_illness: c.history_of_presenting_illness ?? '',
            examination_findings: c.examination_findings ?? '',
            diagnosis_primary: c.diagnosis_primary ?? '',
            diagnosis_secondary: c.diagnosis_secondary ?? '',
            clinical_notes: c.clinical_notes ?? '',
            plan: c.plan ?? '',
            follow_up_date: c.follow_up_date ?? '',
          });
        }
      } catch {
        toast.error('Failed to load visit data.');
        navigate('/opd');
      } finally {
        setLoading(false);
      }
    })();
  }, [visitId, navigate, reset]);

  const buildPayload = (formData, creating = false) => ({
    visit: parseInt(visitId),
    ...(creating && user?.id ? { doctor: user.id } : {}),
    history_of_presenting_illness: formData.history_of_presenting_illness,
    review_of_systems: [...rosSelected].join('; '),
    examination_findings: formData.examination_findings,
    diagnosis_primary: formData.diagnosis_primary,
    diagnosis_secondary: formData.diagnosis_secondary,
    icd10_codes: icd10Codes,
    clinical_notes: formData.clinical_notes,
    plan: formData.plan,
    follow_up_date: formData.follow_up_date || null,
  });

  const saveDraft = async (formData) => {
    setSaving(true);
    try {
      const payload = { ...buildPayload(formData, !consultationId), status: 'DRAFT' };
      if (consultationId) {
        await opdService.updateConsultation(consultationId, payload);
      } else {
        const res = await opdService.createConsultation(payload);
        setConsultationId(res.data.id);
      }
      toast.success('Draft saved.');
    } catch (e) {
      const msg = e.response?.data
        ? Object.values(e.response.data).flat().join(' ')
        : 'Failed to save draft.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const signOff = async (formData) => {
    if (!window.confirm('Sign off this consultation? The form will become read-only.')) return;
    setSaving(true);
    try {
      const payload = { ...buildPayload(formData, !consultationId), status: 'SIGNED_OFF' };
      if (consultationId) {
        await opdService.updateConsultation(consultationId, payload);
      } else {
        const res = await opdService.createConsultation(payload);
        setConsultationId(res.data.id);
      }
      setIsSignedOff(true);
      toast.success('Consultation signed off.');
    } catch (e) {
      const msg = e.response?.data
        ? Object.values(e.response.data).flat().join(' ')
        : 'Failed to sign off.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  // ── Age helper ──────────────────────────────────────────────────────────────
  function computeAge(dob) {
    if (!dob) return null;
    const d = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (
      now.getMonth() < d.getMonth() ||
      (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
    ) age--;
    return age;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const { patient, visit, triage, previous_visits } = ctx;
  const age = computeAge(patient?.date_of_birth);
  const photoUrl = patient?.photo
    ? (patient.photo.startsWith('http') ? patient.photo : `http://localhost:8000${patient.photo}`)
    : null;

  return (
    <div className="flex gap-0 lg:gap-6 min-h-screen -mx-4 lg:mx-0">
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0">
        <div className="sticky top-20 space-y-4">
          {/* Patient card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex flex-col items-center text-center mb-4">
              <InitialsAvatar
                photo={photoUrl}
                name={patient?.full_name ?? ''}
                size="lg"
              />
              <h2 className="mt-3 font-bold text-gray-800 text-base leading-tight">
                {patient?.full_name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{patient?.patient_id}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                <span>{age !== null ? `${age} yrs` : '—'}</span>
                <span className="text-gray-300">·</span>
                <span>{patient?.gender === 'M' ? 'Male' : patient?.gender === 'F' ? 'Female' : patient?.gender}</span>
              </div>
            </div>

            {/* Visit info */}
            <div className="mb-4 pb-4 border-b border-gray-100">
              <StatusBadge status={visit?.status} />
            </div>

            {/* Vitals */}
            {triage && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vitals</p>
                <div className="grid grid-cols-2 gap-2">
                  <VitalItem label="BP" value={triage ? `${triage.blood_pressure_systolic}/${triage.blood_pressure_diastolic}` : null} unit="mmHg" />
                  <VitalItem label="Temp" value={triage?.temperature_celsius} unit="°C" />
                  <VitalItem label="Pulse" value={triage?.pulse_rate} unit="bpm" />
                  <VitalItem label="SpO₂" value={triage?.oxygen_saturation} unit="%" />
                  <VitalItem label="RR" value={triage?.respiratory_rate} unit="br/m" />
                  <VitalItem label="BMI" value={triage?.bmi} />
                </div>
              </div>
            )}

            {/* Allergies */}
            {patient?.allergies && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Allergies
                </p>
                <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 font-medium">
                  {patient.allergies}
                </p>
              </div>
            )}

            {/* Chronic conditions */}
            {patient?.chronic_conditions && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Chronic Conditions</p>
                <p className="text-xs text-gray-700">{patient.chronic_conditions}</p>
              </div>
            )}

            {/* Previous visits */}
            <div>
              <button
                type="button"
                onClick={() => setPreviousVisitsOpen((o) => !o)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                <span>Previous Visits ({previous_visits?.length ?? 0})</span>
                {previousVisitsOpen
                  ? <ChevronUp className="w-3.5 h-3.5" />
                  : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {previousVisitsOpen && previous_visits?.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {previous_visits.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5">
                      <span className="font-mono">{v.visit_number}</span>
                      <span>{v.visit_date}</span>
                      <StatusBadge status={v.status} />
                    </div>
                  ))}
                </div>
              )}
              {previousVisitsOpen && (!previous_visits || previous_visits.length === 0) && (
                <p className="mt-2 text-xs text-gray-400 italic">No previous visits.</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Page header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">Consultation</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {visit?.visit_number} · {visit?.visit_date}
              {isSignedOff && (
                <span className="ml-2 text-green-600 font-semibold">✓ Signed Off</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/opd')}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            ← Back to Queue
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4 pb-32">
          {/* 1. History of Presenting Illness */}
          <CollapsibleSection title="1. History of Presenting Illness">
            <textarea
              rows={5}
              disabled={isSignedOff}
              placeholder="Describe the history of the presenting illness…"
              className={ta}
              {...register('history_of_presenting_illness', {
                required: !isSignedOff ? 'Required' : false,
              })}
            />
            {errors.history_of_presenting_illness && (
              <p className="mt-1 text-xs text-red-500">{errors.history_of_presenting_illness.message}</p>
            )}
          </CollapsibleSection>

          {/* 2. Review of Systems */}
          <CollapsibleSection title="2. Review of Systems">
            <ReviewOfSystems
              selected={rosSelected}
              onChange={setRosSelected}
              readOnly={isSignedOff}
            />
          </CollapsibleSection>

          {/* 3. Examination Findings */}
          <CollapsibleSection title="3. Examination Findings">
            <textarea
              rows={5}
              disabled={isSignedOff}
              placeholder="Describe physical examination findings…"
              className={ta}
              {...register('examination_findings', {
                required: !isSignedOff ? 'Required' : false,
              })}
            />
            {errors.examination_findings && (
              <p className="mt-1 text-xs text-red-500">{errors.examination_findings.message}</p>
            )}
          </CollapsibleSection>

          {/* 4. Diagnosis */}
          <CollapsibleSection title="4. Diagnosis">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Primary Diagnosis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isSignedOff}
                  className={inp}
                  placeholder="e.g. Community-acquired pneumonia"
                  {...register('diagnosis_primary', {
                    required: !isSignedOff ? 'Primary diagnosis is required.' : false,
                  })}
                />
                {errors.diagnosis_primary && (
                  <p className="mt-1 text-xs text-red-500">{errors.diagnosis_primary.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Secondary Diagnosis <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  disabled={isSignedOff}
                  className={inp}
                  placeholder="e.g. Anaemia"
                  {...register('diagnosis_secondary')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  ICD-10 Codes <span className="text-gray-400">(optional)</span>
                </label>
                <Icd10Typeahead
                  selectedCodes={icd10Codes}
                  onChange={setIcd10Codes}
                  readOnly={isSignedOff}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* 5. Plan & Clinical Notes */}
          <CollapsibleSection title="5. Management Plan & Clinical Notes">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Management Plan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  disabled={isSignedOff}
                  className={ta}
                  placeholder="Outline the management plan…"
                  {...register('plan', {
                    required: !isSignedOff ? 'Plan is required.' : false,
                  })}
                />
                {errors.plan && (
                  <p className="mt-1 text-xs text-red-500">{errors.plan.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Clinical Notes <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  disabled={isSignedOff}
                  className={ta}
                  placeholder="Additional notes…"
                  {...register('clinical_notes')}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* 6. Follow-up */}
          <CollapsibleSection title="6. Follow-up">
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Follow-up Date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                disabled={isSignedOff}
                className={inp}
                {...register('follow_up_date')}
              />
            </div>
          </CollapsibleSection>
        </form>

        {/* ── Bottom action bar (fixed) ───────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-end gap-3">
          {!isSignedOff ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit(saveDraft)}
                className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit(signOff)}
                className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Sign Off Consultation'}
              </button>
              <ReferralDropdown consultationId={consultationId} disabled={saving} />
            </>
          ) : (
            <>
              <ReferralDropdown consultationId={consultationId} />
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Summary
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
