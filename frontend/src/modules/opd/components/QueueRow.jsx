import { Clock, Activity, Stethoscope, DoorOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../patients/components/StatusBadge';
import InitialsAvatar from '../../patients/components/InitialsAvatar';

function waitTime(createdAt) {
  const diff = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  if (diff < 1) return '< 1 min';
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const VISIT_TYPE_LABELS = {
  OPD: 'OPD',
  EMERGENCY: 'Emergency',
  FOLLOW_UP: 'Follow-Up',
};

export default function QueueRow({ visit, onTriage, roomNumber }) {
  const navigate = useNavigate();
  const triage = visit.triage;
  const isTriage  = visit.status === 'WAITING' && !triage;
  const canConsult = visit.status === 'TRIAGE_DONE' || (visit.status === 'WAITING' && triage);

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      {/* Patient */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <InitialsAvatar name={visit.patient.name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">
              {visit.patient.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400 font-mono">{visit.patient.patient_id}</p>
              {roomNumber && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-primary">
                  <DoorOpen className="w-3 h-3" />
                  {roomNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={visit.status} />
      </td>

      {/* Visit type */}
      <td className="px-4 py-3 text-sm text-gray-500">
        {VISIT_TYPE_LABELS[visit.visit_type] ?? visit.visit_type}
      </td>

      {/* Wait time */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {waitTime(visit.created_at)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {isTriage && (
            <button
              onClick={() => onTriage(visit)}
              className="inline-flex items-center gap-1.5 text-xs font-medium
                         bg-amber-50 text-amber-700 border border-amber-200
                         rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              Triage
            </button>
          )}
          {canConsult && (
            <button
              onClick={() => navigate(`/opd/consultation/${visit.id}`)}
              className="inline-flex items-center gap-1.5 text-xs font-medium
                         bg-primary text-white rounded-lg px-3 py-1.5
                         hover:bg-primary-dark transition-colors"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Start Consultation
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
