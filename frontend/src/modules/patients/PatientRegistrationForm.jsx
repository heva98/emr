import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Camera, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { patientService } from '../../services/patientService';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Personal Info' },
  { num: 2, label: 'Contact Details' },
  { num: 3, label: 'Next of Kin' },
  { num: 4, label: 'Medical' },
  { num: 5, label: 'Review' },
];

const STEP_FIELDS = {
  0: ['first_name', 'last_name', 'date_of_birth', 'gender'],
  1: ['phone_primary', 'address_street', 'address_city', 'address_district', 'address_region'],
  2: ['next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship'],
  3: [],
};

const BLOOD_GROUPS = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'A_POS',  label: 'A+' },
  { value: 'A_NEG',  label: 'A-' },
  { value: 'B_POS',  label: 'B+' },
  { value: 'B_NEG',  label: 'B-' },
  { value: 'AB_POS', label: 'AB+' },
  { value: 'AB_NEG', label: 'AB-' },
  { value: 'O_POS',  label: 'O+' },
  { value: 'O_NEG',  label: 'O-' },
];

const GENDER_LABELS = { M: 'Male', F: 'Female', OTHER: 'Other' };

// ─── Shared small components ──────────────────────────────────────────────────

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
    </div>
  );
}

const base = 'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition';
const inputCls  = `${base} border-gray-300`;
const inputErr  = `${base} border-red-300`;
const sel       = `${base} border-gray-300 bg-white`;
const ta        = `${base} border-gray-300 resize-none`;

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }) {
  return (
    <div className="flex items-start mb-8 overflow-x-auto pb-2">
      {STEPS.map((s, idx) => {
        const done   = idx < current;
        const active = idx === current;
        return (
          <div key={s.num} className="flex items-start flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center min-w-[2.5rem]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all
                  ${done ? 'bg-primary text-white' : active ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-gray-200 text-gray-500'}`}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : s.num}
              </div>
              <span className={`mt-1 text-[11px] font-medium text-center leading-tight ${active ? 'text-primary' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-4 transition-colors ${done ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 — Personal Info ──────────────────────────────────────────────────

function Step1({ register, errors, dob, setValue, photoPreview, setPhotoPreview }) {
  const fileRef = useRef(null);

  const age = useMemo(() => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a >= 0 ? a : null;
  }, [dob]);

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setValue('photo', file, { shouldDirty: true });
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-5">
      {/* Photo upload */}
      <div className="flex justify-center mb-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary transition-colors group focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
              <Camera className="w-7 h-7" />
              <span className="text-[10px] mt-1 font-medium">Add Photo</span>
            </div>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="First Name" required error={errors.first_name}>
          <input
            {...register('first_name', { required: 'First name is required' })}
            className={errors.first_name ? inputErr : inputCls}
            placeholder="John"
          />
        </Field>
        <Field label="Middle Name" error={errors.middle_name}>
          <input {...register('middle_name')} className={inputCls} placeholder="Optional" />
        </Field>
        <Field label="Last Name" required error={errors.last_name}>
          <input
            {...register('last_name', { required: 'Last name is required' })}
            className={errors.last_name ? inputErr : inputCls}
            placeholder="Doe"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date of Birth" required error={errors.date_of_birth}>
          <div className="relative">
            <input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              {...register('date_of_birth', { required: 'Date of birth is required' })}
              className={errors.date_of_birth ? inputErr : inputCls}
            />
            {age !== null && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary pointer-events-none">
                {age} yrs
              </span>
            )}
          </div>
        </Field>

        <Field label="Gender" required error={errors.gender}>
          <div className="flex gap-5 pt-2.5">
            {[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'OTHER', label: 'Other' }].map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  value={value}
                  {...register('gender', { required: 'Gender is required' })}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
          {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p>}
        </Field>
      </div>

      <Field label="National ID" error={errors.national_id}>
        <input {...register('national_id')} className={inputCls} placeholder="Optional — leave blank if unknown" />
      </Field>
    </div>
  );
}

// ─── Step 2 — Contact Details ────────────────────────────────────────────────

function Step2({ register, errors }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Primary Phone" required error={errors.phone_primary}>
          <input
            {...register('phone_primary', {
              required: 'Primary phone is required',
              minLength: { value: 9, message: 'Enter a valid phone number' },
            })}
            className={errors.phone_primary ? inputErr : inputCls}
            placeholder="+255 700 000 000"
          />
        </Field>
        <Field label="Secondary Phone" error={errors.phone_secondary}>
          <input {...register('phone_secondary')} className={inputCls} placeholder="Optional" />
        </Field>
      </div>

      <Field label="Email Address" error={errors.email}>
        <input
          type="email"
          {...register('email', {
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' },
          })}
          className={errors.email ? inputErr : inputCls}
          placeholder="Optional"
        />
      </Field>

      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider pt-1">Address</p>

      <Field label="Street / Area" required error={errors.address_street}>
        <input
          {...register('address_street', { required: 'Street is required' })}
          className={errors.address_street ? inputErr : inputCls}
          placeholder="e.g. Mikocheni B"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="City" required error={errors.address_city}>
          <input
            {...register('address_city', { required: 'City is required' })}
            className={errors.address_city ? inputErr : inputCls}
            placeholder="Dar es Salaam"
          />
        </Field>
        <Field label="District" required error={errors.address_district}>
          <input
            {...register('address_district', { required: 'District is required' })}
            className={errors.address_district ? inputErr : inputCls}
            placeholder="Kinondoni"
          />
        </Field>
        <Field label="Region" required error={errors.address_region}>
          <input
            {...register('address_region', { required: 'Region is required' })}
            className={errors.address_region ? inputErr : inputCls}
            placeholder="Dar es Salaam"
          />
        </Field>
      </div>
    </div>
  );
}

// ─── Step 3 — Next of Kin ───────────────────────────────────────────────────

function Step3({ register, errors }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Emergency contact who should be notified if needed.</p>
      <Field label="Full Name" required error={errors.next_of_kin_name}>
        <input
          {...register('next_of_kin_name', { required: 'Name is required' })}
          className={errors.next_of_kin_name ? inputErr : inputCls}
          placeholder="Jane Doe"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone Number" required error={errors.next_of_kin_phone}>
          <input
            {...register('next_of_kin_phone', {
              required: 'Phone is required',
              minLength: { value: 9, message: 'Enter a valid phone number' },
            })}
            className={errors.next_of_kin_phone ? inputErr : inputCls}
            placeholder="+255 700 000 000"
          />
        </Field>
        <Field label="Relationship" required error={errors.next_of_kin_relationship}>
          <input
            {...register('next_of_kin_relationship', { required: 'Relationship is required' })}
            className={errors.next_of_kin_relationship ? inputErr : inputCls}
            placeholder="e.g. Mother, Spouse, Sibling"
          />
        </Field>
      </div>
    </div>
  );
}

// ─── Step 4 — Medical Background ────────────────────────────────────────────

function Step4({ register }) {
  return (
    <div className="space-y-5">
      <Field label="Blood Group">
        <select {...register('blood_group')} className={sel}>
          {BLOOD_GROUPS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Field>
      <Field label="Known Allergies">
        <textarea
          {...register('allergies')}
          rows={3}
          className={ta}
          placeholder="List any known drug or food allergies (optional)"
        />
      </Field>
      <Field label="Chronic Conditions">
        <textarea
          {...register('chronic_conditions')}
          rows={3}
          className={ta}
          placeholder="e.g. Hypertension, Diabetes Type 2 (optional)"
        />
      </Field>
    </div>
  );
}

// ─── Step 5 — Review ────────────────────────────────────────────────────────

function Step5({ getValues, goToStep }) {
  const v = getValues();
  const bloodLabel = BLOOD_GROUPS.find((b) => b.value === v.blood_group)?.label ?? 'Unknown';

  function Row({ label, value }) {
    return (
      <div className="flex gap-3 py-1.5 border-b border-gray-100 last:border-0">
        <span className="w-36 text-xs text-gray-500 font-medium shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-800 break-words">{value || <span className="text-gray-400 italic">—</span>}</span>
      </div>
    );
  }

  function Section({ title, step, children }) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <button type="button" onClick={() => goToStep(step)} className="text-xs text-primary hover:underline font-medium">
            Edit
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">Review all details carefully before submitting.</p>

      <Section title="Personal Information" step={0}>
        <Row label="Full Name" value={[v.first_name, v.middle_name, v.last_name].filter(Boolean).join(' ')} />
        <Row label="Date of Birth" value={v.date_of_birth} />
        <Row label="Gender" value={GENDER_LABELS[v.gender] ?? v.gender} />
        <Row label="National ID" value={v.national_id} />
      </Section>

      <Section title="Contact Details" step={1}>
        <Row label="Primary Phone" value={v.phone_primary} />
        <Row label="Secondary Phone" value={v.phone_secondary} />
        <Row label="Email" value={v.email} />
        <Row
          label="Address"
          value={[v.address_street, v.address_city, v.address_district, v.address_region].filter(Boolean).join(', ')}
        />
      </Section>

      <Section title="Next of Kin" step={2}>
        <Row label="Name" value={v.next_of_kin_name} />
        <Row label="Phone" value={v.next_of_kin_phone} />
        <Row label="Relationship" value={v.next_of_kin_relationship} />
      </Section>

      <Section title="Medical Background" step={3}>
        <Row label="Blood Group" value={bloodLabel} />
        <Row label="Allergies" value={v.allergies} />
        <Row label="Chronic Conditions" value={v.chronic_conditions} />
      </Section>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PatientRegistrationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(isEdit);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
    trigger,
    getValues,
  } = useForm({ defaultValues: { blood_group: 'UNKNOWN' } });

  const dob = watch('date_of_birth');

  useEffect(() => {
    if (!isEdit) return;
    patientService
      .get(id)
      .then(({ data }) => {
        const {
          photo, registered_by, registered_by_name, full_name,
          age, visits_count, created_at, updated_at, patient_id,
          ...formData
        } = data;
        reset(formData);
        if (photo) setPhotoPreview(photo);
      })
      .catch(() => {
        toast.error('Failed to load patient data');
        navigate('/registration');
      })
      .finally(() => setLoadingPatient(false));
  }, [id, isEdit, navigate, reset]);

  async function handleNext() {
    const fields = STEP_FIELDS[step];
    if (fields?.length) {
      const ok = await trigger(fields);
      if (!ok) return;
    }
    setStep((s) => s + 1);
  }

  async function onSubmit(data) {
    setSubmitting(true);
    try {
      if (isEdit) {
        await patientService.update(id, data);
        toast.success('Patient updated successfully');
        navigate(`/registration/${id}`);
      } else {
        const { data: patient } = await patientService.create(data);
        toast.success('Patient registered successfully!');
        navigate(`/registration/${patient.id}`);
      }
    } catch (err) {
      const errs = err.response?.data;
      if (errs && typeof errs === 'object' && !Array.isArray(errs)) {
        const [field, msgs] = Object.entries(errs)[0];
        const msg = Array.isArray(msgs) ? msgs[0] : msgs;
        toast.error(`${field}: ${msg}`);
      } else {
        toast.error('An error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">
          {isEdit ? 'Edit Patient Record' : 'Register New Patient'}
        </h1>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {step === 0 && (
            <Step1
              register={register}
              errors={errors}
              dob={dob}
              setValue={setValue}
              photoPreview={photoPreview}
              setPhotoPreview={setPhotoPreview}
            />
          )}
          {step === 1 && <Step2 register={register} errors={errors} />}
          {step === 2 && <Step3 register={register} errors={errors} />}
          {step === 3 && <Step4 register={register} />}
          {step === 4 && <Step5 getValues={getValues} goToStep={setStep} />}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/registration')}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {isEdit ? 'Save Changes' : 'Register Patient'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
