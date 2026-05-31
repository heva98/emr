import { useState, useEffect } from 'react';
import {
  UserPlus, Activity, Stethoscope, FlaskConical, Pill, CreditCard,
  CheckCircle2, Loader2, Circle,
} from 'lucide-react';
import { opdService } from '../services/opdService';

const STEPS = [
  { key: 'registration', label: 'Registration',   Icon: UserPlus     },
  { key: 'triage',       label: 'Triage',          Icon: Activity     },
  { key: 'consultation', label: 'Consultation',    Icon: Stethoscope  },
  { key: 'lab',          label: 'Laboratory',      Icon: FlaskConical },
  { key: 'pharmacy',     label: 'Pharmacy',        Icon: Pill         },
  { key: 'cashier',      label: 'Cashier',         Icon: CreditCard   },
];

function fmtTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short' });
}

function StepNode({ step, data, isActive }) {
  const { label, Icon } = step;

  const done    = !!data?.timestamp;
  const skipped = data === null && !isActive;

  let nodeClass = 'border-2 ';
  if (done)    nodeClass += 'bg-green-500 border-green-500 text-white';
  else if (isActive) nodeClass += 'bg-teal-500 border-teal-500 text-white';
  else if (skipped)  nodeClass += 'bg-gray-100 border-gray-200 text-gray-300';
  else               nodeClass += 'bg-white border-gray-300 text-gray-400';

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[70px] max-w-[90px]">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center relative ${nodeClass}`}>
        {done
          ? <CheckCircle2 className="w-5 h-5" />
          : isActive
            ? <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            : <Icon className="w-4 h-4" />
        }
      </div>
      <div className="text-center">
        <p className={`text-xs font-semibold leading-tight ${done ? 'text-green-700' : isActive ? 'text-teal-700' : 'text-gray-400'}`}>
          {label}
        </p>
        {done && data?.timestamp && (
          <>
            <p className="text-[10px] text-gray-500 leading-tight">{fmtTime(data.timestamp)}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{fmtDate(data.timestamp)}</p>
          </>
        )}
        {done && data?.staff && (
          <p className="text-[10px] text-gray-400 leading-tight truncate max-w-[80px]" title={data.staff}>
            {data.staff.split(' ')[0]}
          </p>
        )}
        {isActive && <p className="text-[10px] text-teal-600 animate-pulse">In progress</p>}
      </div>
    </div>
  );
}

function Connector({ done }) {
  return (
    <div className="flex-1 h-0.5 mt-[18px] self-start mx-1">
      <div className={`h-full rounded ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
    </div>
  );
}

export default function VisitTimeline({ visitId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!visitId) return;
    setLoading(true);
    opdService
      .getVisitTimeline(visitId)
      .then(({ data: d }) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [visitId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading timeline…
      </div>
    );
  }

  if (error || !data) return null;

  const { timeline, visit_status } = data;

  // Determine active step (first step that exists but isn't done)
  const stepData = {
    registration: timeline.registration,
    triage:       timeline.triage,
    consultation: timeline.consultation,
    lab:          timeline.lab,
    pharmacy:     timeline.pharmacy,
    cashier:      timeline.cashier,
  };

  // A step is "active" if the current visit_status maps to it
  const STATUS_TO_STEP = {
    WAITING:          'registration',
    TRIAGE_DONE:      'triage',
    WITH_DOCTOR:      'consultation',
    LAB_PENDING:      'lab',
    PHARMACY_PENDING: 'pharmacy',
    BILLING_PENDING:  'cashier',
  };
  const activeStep = STATUS_TO_STEP[visit_status] ?? null;

  // Only render Lab/Pharmacy/Cashier nodes if they exist or are active
  const visibleSteps = STEPS.filter(({ key }) => {
    if (['registration', 'triage', 'consultation'].includes(key)) return true;
    return stepData[key] !== undefined && stepData[key] !== null || key === activeStep;
  });

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-4 mt-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Visit Journey</p>
      <div className="flex items-start overflow-x-auto pb-1">
        {visibleSteps.map((step, idx) => (
          <div key={step.key} className="flex items-start shrink-0">
            <StepNode
              step={step}
              data={stepData[step.key]}
              isActive={step.key === activeStep}
            />
            {idx < visibleSteps.length - 1 && (
              <Connector done={!!stepData[visibleSteps[idx + 1]?.key]?.timestamp} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
