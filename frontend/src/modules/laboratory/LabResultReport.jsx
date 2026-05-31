import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { labService } from '../../services/labService';

const FACILITY_NAME    = import.meta.env.VITE_FACILITY_NAME    || 'General Hospital';
const FACILITY_ADDRESS = import.meta.env.VITE_FACILITY_ADDRESS || 'P.O. Box 1234, Dar es Salaam, Tanzania';
const FACILITY_PHONE   = import.meta.env.VITE_FACILITY_PHONE   || '+255 000 000 000';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-TZ', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-TZ', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const FLAG_PRINT_CLS = {
  NORMAL:        'text-green-700',
  LOW:           'text-amber-700 font-semibold',
  HIGH:          'text-amber-700 font-semibold',
  CRITICAL_LOW:  'text-red-700 font-bold',
  CRITICAL_HIGH: 'text-red-700 font-bold',
  POSITIVE:      'text-blue-700',
  NEGATIVE:      'text-gray-600',
  NOT_DONE:      'text-gray-400',
};

const FLAG_LABELS = {
  NORMAL: 'Normal', LOW: 'Low', HIGH: 'High',
  CRITICAL_LOW: 'Critical Low', CRITICAL_HIGH: 'Critical High',
  POSITIVE: 'Positive', NEGATIVE: 'Negative', NOT_DONE: 'Not Done',
};

export default function LabResultReport() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    labService.getOrder(id)
      .then((res) => setOrder(res.data))
      .catch(() => setError(true));
  }, [id]);

  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [order]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Failed to load report. Please close and try again.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-400 border-t-transparent" />
      </div>
    );
  }

  const p = order.patient_display;

  // Collect all verified results from items
  const resultRows = order.items
    .filter((item) => item.result)
    .map((item) => ({ item, result: item.result }));

  const verifiedBy   = resultRows.find((r) => r.result.verified_by_name)?.result.verified_by_name ?? '—';
  const verifiedAt   = resultRows.find((r) => r.result.verified_at)?.result.verified_at;

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { font-size: 11pt; color: #000; }
          .no-print { display: none !important; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
      `}</style>

      <div className="max-w-3xl mx-auto p-8 bg-white">
        {/* Facility header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">{FACILITY_NAME}</h1>
          <p className="text-sm text-gray-600 mt-1">{FACILITY_ADDRESS}</p>
          <p className="text-sm text-gray-600">Tel: {FACILITY_PHONE}</p>
          <h2 className="text-lg font-bold text-gray-800 mt-3 uppercase tracking-widest">
            Laboratory Results Report
          </h2>
        </div>

        {/* Two-column info block */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Patient Information</p>
            <table className="w-full">
              <tbody>
                <InfoRow label="Name"       value={p?.name} />
                <InfoRow label="Patient ID" value={p?.patient_id} mono />
                <InfoRow label="Age"        value={p?.age != null ? `${p.age} years` : '—'} />
                <InfoRow label="Gender"     value={p?.gender_display ?? '—'} />
                <InfoRow label="Visit No."  value={order.visit_number} mono />
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Order Information</p>
            <table className="w-full">
              <tbody>
                <InfoRow label="Order No."    value={order.order_number} mono />
                <InfoRow label="Ordered By"   value={order.ordered_by_name} />
                <InfoRow label="Order Date"   value={fmtDateTime(order.ordered_at)} />
                <InfoRow label="Priority"     value={order.priority} />
                <InfoRow label="Report Date"  value={fmtDate(new Date().toISOString())} />
              </tbody>
            </table>
          </div>
        </div>

        {/* Results table */}
        <table className="w-full text-sm border-collapse mb-8">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Test</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Result</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Unit</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Normal Range</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Flag</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Verified By</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {resultRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-gray-300 px-3 py-4 text-center text-gray-400 italic">
                  No results available.
                </td>
              </tr>
            ) : (
              resultRows.map(({ item, result }) => (
                <tr key={item.id} className="even:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2">
                    <span className="font-medium">{item.test_name}</span>
                    <span className="block text-xs text-gray-400 font-mono">{item.test_code}</span>
                  </td>
                  <td className="border border-gray-300 px-3 py-2 font-semibold">{result.result_value}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-500">{item.test_unit || '—'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-600">
                    {result.normal_low != null || result.normal_high != null
                      ? `${result.normal_low ?? '—'} – ${result.normal_high ?? '—'}`
                      : '—'}
                  </td>
                  <td className={`border border-gray-300 px-3 py-2 ${FLAG_PRINT_CLS[result.flag] ?? 'text-gray-600'}`}>
                    {FLAG_LABELS[result.flag] ?? result.flag}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-600">
                    {result.verified_by_name ?? '—'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-500 text-xs">
                    {fmtDateTime(result.verified_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Signature line */}
        <div className="mt-12 flex justify-between items-end">
          <div>
            <div className="border-t border-gray-700 w-48 mb-1" />
            <p className="text-sm font-semibold text-gray-800">{verifiedBy}</p>
            <p className="text-xs text-gray-500">Laboratory Scientist</p>
            <p className="text-xs text-gray-500">{verifiedAt ? fmtDateTime(verifiedAt) : ''}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Order: {order.order_number}</p>
            <p>Printed: {fmtDateTime(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Print button (hidden on actual print) */}
        <div className="no-print mt-8 text-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <tr>
      <td className="py-0.5 pr-3 text-gray-500 font-medium w-28 align-top">{label}:</td>
      <td className={`py-0.5 text-gray-800 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</td>
    </tr>
  );
}
