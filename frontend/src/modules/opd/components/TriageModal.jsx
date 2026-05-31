import { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { X, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import { opdService } from '../../../services/opdService';

const TRIAGE_LEVELS = [
  { value: 1, label: 'Resuscitation',  color: 'bg-red-600 hover:bg-red-700 border-red-700' },
  { value: 2, label: 'Emergency',      color: 'bg-orange-500 hover:bg-orange-600 border-orange-600' },
  { value: 3, label: 'Urgent',         color: 'bg-yellow-400 hover:bg-yellow-500 border-yellow-500 text-gray-900' },
  { value: 4, label: 'Semi-urgent',    color: 'bg-blue-500 hover:bg-blue-600 border-blue-600' },
  { value: 5, label: 'Non-urgent',     color: 'bg-green-500 hover:bg-green-600 border-green-600' },
];

const PAIN_EMOJIS = { 0: '😌', 2: '🙂', 4: '😐', 6: '😟', 8: '😣', 10: '😭' };
function getPainEmoji(score) {
  const key = Math.round(score / 2) * 2;
  return PAIN_EMOJIS[key] ?? '😐';
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';
const err = 'mt-1 text-xs text-red-500';

function parseNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
function parseInt2(v) {
  const n = parseInt(v);
  return isNaN(n) ? null : n;
}

export default function TriageModal({ visit, onClose, onSuccess }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      weight_kg: '',
      height_cm: '',
      temperature_celsius: '',
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      pulse_rate: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      triage_level: null,
      pain_score: 0,
    },
  });

  const weight = parseFloat(watch('weight_kg'));
  const height = parseFloat(watch('height_cm'));
  const triageLevel = watch('triage_level');
  const painScore = watch('pain_score');

  const bmi =
    weight > 0 && height > 0
      ? (weight / Math.pow(height / 100, 2)).toFixed(1)
      : null;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const onSubmit = useCallback(
    async (data) => {
      if (!data.triage_level) {
        toast.error('Please select a triage level.');
        return;
      }
      try {
        await opdService.createTriage({
          visit: visit.id,
          weight_kg: data.weight_kg,
          height_cm: parseNum(data.height_cm),
          temperature_celsius: data.temperature_celsius,
          blood_pressure_systolic: parseInt2(data.blood_pressure_systolic),
          blood_pressure_diastolic: parseInt2(data.blood_pressure_diastolic),
          pulse_rate: parseInt2(data.pulse_rate),
          respiratory_rate: parseInt2(data.respiratory_rate),
          oxygen_saturation: parseInt2(data.oxygen_saturation),
          triage_level: parseInt(data.triage_level),
          pain_score: parseInt2(data.pain_score),
        });
        toast.success('Triage recorded successfully.');
        onSuccess();
      } catch (e) {
        const msg = e.response?.data
          ? Object.values(e.response.data).flat().join(' ')
          : 'Failed to save triage.';
        toast.error(msg);
      }
    },
    [visit.id, onSuccess]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Triage Assessment</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {visit.patient.name} · {visit.patient.patient_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Vitals grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* Weight — required */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" step="0.1" min="0" max="300"
                className={inp}
                placeholder="e.g. 72.5"
                {...register('weight_kg', { required: 'Required' })}
              />
              {errors.weight_kg && <p className={err}>{errors.weight_kg.message}</p>}
            </div>

            {/* Height — optional */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Height (cm)
              </label>
              <input
                type="number" step="0.1" min="0" max="250"
                className={inp}
                placeholder="e.g. 165.0"
                {...register('height_cm')}
              />
            </div>

            {/* BMI display */}
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-medium text-gray-600 mb-1">BMI (auto)</label>
              <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 h-[38px]">
                <Scale className="w-3.5 h-3.5 text-gray-400" />
                <span className={`font-semibold ${bmi ? 'text-primary' : 'text-gray-400'}`}>
                  {bmi ?? '—'}
                </span>
              </div>
            </div>

            {/* Temperature — required */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Temperature (°C) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" step="0.1" min="30" max="45"
                className={inp}
                placeholder="e.g. 37.2"
                {...register('temperature_celsius', { required: 'Required' })}
              />
              {errors.temperature_celsius && <p className={err}>{errors.temperature_celsius.message}</p>}
            </div>

            {/* Blood Pressure — optional */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Blood Pressure (mmHg)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="50" max="300"
                  className={inp}
                  placeholder="Sys"
                  {...register('blood_pressure_systolic')}
                />
                <span className="text-gray-400 text-sm shrink-0">/</span>
                <input
                  type="number" min="30" max="200"
                  className={inp}
                  placeholder="Dia"
                  {...register('blood_pressure_diastolic')}
                />
              </div>
            </div>

            {/* Pulse — optional */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Pulse (bpm)
              </label>
              <input
                type="number" min="20" max="300"
                className={inp}
                placeholder="e.g. 72"
                {...register('pulse_rate')}
              />
            </div>

            {/* Respiratory rate — optional */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Resp. Rate (br/min)
              </label>
              <input
                type="number" min="5" max="60"
                className={inp}
                placeholder="e.g. 16"
                {...register('respiratory_rate')}
              />
            </div>

            {/* SpO2 — optional */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                SpO₂ (%)
              </label>
              <input
                type="number" min="0" max="100"
                className={inp}
                placeholder="e.g. 98"
                {...register('oxygen_saturation', {
                  min: { value: 0, message: 'Min 0' },
                  max: { value: 100, message: 'Max 100' },
                })}
              />
              {errors.oxygen_saturation && <p className={err}>{errors.oxygen_saturation.message}</p>}
            </div>
          </div>

          {/* Triage Level */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Triage Level <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {TRIAGE_LEVELS.map((lv) => (
                <button
                  key={lv.value}
                  type="button"
                  onClick={() => setValue('triage_level', lv.value)}
                  className={`flex flex-col items-center justify-center rounded-xl p-3 text-white text-xs font-bold border-2 transition-all
                    ${lv.color}
                    ${triageLevel === lv.value
                      ? 'ring-2 ring-offset-2 ring-gray-800 scale-105'
                      : 'opacity-70 hover:opacity-100'}
                    ${lv.value === 3 ? 'text-gray-900' : ''}
                  `}
                >
                  <span className="text-lg font-extrabold">{lv.value}</span>
                  <span className="text-center leading-tight mt-0.5" style={{ fontSize: '10px' }}>
                    {lv.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Pain Score */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Pain Score:{' '}
              <span className="font-bold text-gray-800">{painScore}</span>
              {' '}{getPainEmoji(Number(painScore))}
            </label>
            <div className="flex items-center gap-3">
              <span className="text-lg">{getPainEmoji(0)}</span>
              <div className="flex-1">
                <input
                  type="range" min="0" max="10" step="1"
                  className="w-full h-2 appearance-none rounded-full cursor-pointer accent-primary"
                  {...register('pain_score')}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
                  {[0, 2, 4, 6, 8, 10].map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
              </div>
              <span className="text-lg">{getPainEmoji(10)}</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmit)}
            className="px-6 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Saving…' : 'Save Triage'}
          </button>
        </div>
      </div>
    </div>
  );
}
