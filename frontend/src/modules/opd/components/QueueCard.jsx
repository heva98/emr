import { Clock, UserRound, DoorOpen, Stethoscope, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TriageLevelBadge from './TriageLevelBadge';
import StatusBadge from '../../patients/components/StatusBadge';

function useWaitTime(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) return '< 1 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function QueueCard({ visit, onTriage }) {
  const navigate = useNavigate();
  const waitTime = useWaitTime(visit.created_at);
  const triage = visit.triage;
  const isTriage = visit.status === 'WAITING' && !triage;
  const canConsult = visit.status === 'TRIAGE_DONE' || (visit.status === 'WAITING' && triage);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TriageLevelBadge level={visit.triage_level} compact />
          <StatusBadge status={visit.status} />
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
          <Clock className="w-3 h-3" />
          {waitTime}
        </span>
      </div>

      {/* Patient info */}
      <div>
        <p className="font-semibold text-gray-800 text-sm leading-tight">
          {visit.patient.name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{visit.patient.patient_id}</p>
      </div>

      {/* Doctor / room */}
      {(visit.doctor_name || visit.room_name) && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {visit.doctor_name && (
            <span className="flex items-center gap-1">
              <UserRound className="w-3 h-3" />
              {visit.doctor_name}
            </span>
          )}
          {visit.room_name && (
            <span className="flex items-center gap-1">
              <DoorOpen className="w-3 h-3" />
              {visit.room_name}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-50 mt-auto">
        {isTriage && (
          <button
            onClick={() => onTriage(visit)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium
                       bg-amber-50 text-amber-700 border border-amber-200
                       rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            Triage
          </button>
        )}
        {canConsult && (
          <button
            onClick={() => navigate(`/opd/consultation/${visit.id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium
                       bg-primary text-white rounded-lg px-3 py-2
                       hover:bg-primary-dark transition-colors"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Start Consultation
          </button>
        )}
        {!isTriage && !canConsult && (
          <span className="text-xs text-gray-400 italic">No actions available</span>
        )}
      </div>
    </div>
  );
}
