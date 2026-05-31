import { AlertTriangle, Activity } from 'lucide-react';
import InitialsAvatar from '../modules/patients/components/InitialsAvatar';
import StatusBadge from '../modules/patients/components/StatusBadge';

const GENDER_LABELS = { M: 'Male', F: 'Female', OTHER: 'Other' };

function AllergyBadge({ text }) {
  if (!text) return null;
  return (
    <div className="relative group inline-block">
      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200 cursor-default">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        ALLERGIES
      </span>
      <div className="absolute top-full mt-1.5 left-0 z-50 hidden group-hover:block w-max max-w-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-lg pointer-events-none">
        <p className="text-xs font-semibold text-red-700 mb-0.5">Known Allergies</p>
        <p className="text-xs text-red-800">{text}</p>
      </div>
    </div>
  );
}

function ChronicBadge({ text }) {
  if (!text) return null;
  return (
    <div className="relative group inline-block">
      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-200 cursor-default">
        <Activity className="w-3 h-3 shrink-0" />
        CHRONIC
      </span>
      <div className="absolute top-full mt-1.5 left-0 z-50 hidden group-hover:block w-max max-w-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 shadow-lg pointer-events-none">
        <p className="text-xs font-semibold text-amber-700 mb-0.5">Chronic Conditions</p>
        <p className="text-xs text-amber-800">{text}</p>
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * patient prop shape (all optional except what's needed for display):
 *   { full_name, first_name, last_name, patient_id, age, date_of_birth,
 *     gender, photo, allergies, chronic_conditions }
 *
 * visit prop shape (all optional):
 *   { visit_number, visit_date, status }
 */
export default function PatientVisitHeader({ patient = {}, visit = {} }) {
  const fullName =
    patient.full_name ??
    [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ') ??
    patient.name ??
    '—';

  const firstName = patient.first_name ?? (fullName.split(' ')[0] ?? '');
  const lastName  = patient.last_name  ?? (fullName.split(' ').at(-1) ?? '');

  const age    = patient.age ?? null;
  const gender = GENDER_LABELS[patient.gender] ?? patient.gender ?? null;

  const photoUrl = patient.photo
    ? (patient.photo.startsWith('http') ? patient.photo : `http://localhost:8000${patient.photo}`)
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Avatar */}
        <InitialsAvatar
          firstName={firstName}
          lastName={lastName}
          photoUrl={photoUrl}
          size="md"
        />

        {/* Patient info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {patient.patient_id && (
              <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
                {patient.patient_id}
              </span>
            )}
            {visit.visit_number && (
              <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {visit.visit_number}
              </span>
            )}
            {visit.status && <StatusBadge status={visit.status} />}
          </div>

          <h2 className="text-base font-bold text-gray-900 leading-tight truncate">{fullName}</h2>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {(age !== null || gender) && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {[age !== null ? `${age} yrs` : null, gender].filter(Boolean).join(' · ')}
              </span>
            )}
            {visit.visit_date && (
              <span className="text-xs text-gray-400">{fmtDate(visit.visit_date)}</span>
            )}
            <AllergyBadge text={patient.allergies} />
            <ChronicBadge text={patient.chronic_conditions} />
          </div>
        </div>
      </div>
    </div>
  );
}
