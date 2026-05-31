import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { cashierService } from '../../services/cashierService';
import { fmtTZS, fmtDate, fmtDateTime } from './utils';

const FACILITY_NAME    = import.meta.env.VITE_FACILITY_NAME    || 'General Hospital';
const FACILITY_ADDRESS = import.meta.env.VITE_FACILITY_ADDRESS || 'P.O. Box 1234, Dar es Salaam, Tanzania';
const FACILITY_PHONE   = import.meta.env.VITE_FACILITY_PHONE   || '+255 000 000 000';

const SERVICE_TYPE_LABELS = {
  CONSULTATION: 'Consultation',
  LAB:          'Laboratory',
  PHARMACY:     'Pharmacy',
  MANUAL:       'Other',
};

export default function ReceiptPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError]     = useState(false);

  useEffect(() => {
    cashierService.getReceipt(id)
      .then((res) => setInvoice(res.data))
      .catch(() => setError(true));
  }, [id]);

  // Auto-print once data is loaded
  useEffect(() => {
    if (invoice) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [invoice]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-sm">
        Failed to load receipt. Please close this tab and try again.
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm animate-pulse">
        Loading receipt…
      </div>
    );
  }

  const p = invoice.patient_detail ?? {};
  const v = invoice.visit_detail ?? {};
  const fullName = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
  const payments = invoice.payments ?? [];
  const items    = invoice.items ?? [];
  const cashTotal   = payments.filter((x) => x.payment_method === 'CASH').reduce((s, x) => s + x.amount, 0);
  const mobileTotal = payments.filter((x) => x.payment_method === 'MOBILE_MONEY').reduce((s, x) => s + x.amount, 0);
  const isPaid = invoice.status === 'PAID';

  return (
    <>
      {/* ── Print button — hidden when printing ── */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      {/* ── Receipt content ── */}
      <div className="min-h-screen bg-gray-100 print:bg-white flex items-start justify-center py-8 print:py-0 print:block">
        <div
          id="receipt"
          className="bg-white w-full max-w-[600px] print:max-w-none shadow-lg print:shadow-none mx-4 print:mx-0 relative"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {/* PAID IN FULL stamp */}
          {isPaid && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
              <div
                className="border-4 border-green-500 text-green-500 text-4xl font-bold tracking-widest px-10 py-5 rounded-xl opacity-20 select-none"
                style={{ transform: 'rotate(15deg)', whiteSpace: 'nowrap' }}
              >
                PAID IN FULL
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center border-b-2 border-gray-200 pb-5 pt-6 px-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-wide uppercase">
              {FACILITY_NAME}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{FACILITY_ADDRESS}</p>
            <p className="text-sm text-gray-500">Tel: {FACILITY_PHONE}</p>
            <div className="mt-4 inline-block bg-gray-900 text-white px-8 py-1.5 text-sm font-bold tracking-[0.2em] uppercase">
              Receipt
            </div>
          </div>

          {/* Receipt meta */}
          <div className="px-8 py-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-b border-gray-100">
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Receipt #</span>
              <p className="font-mono font-semibold text-gray-800">{invoice.invoice_number}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Date</span>
              <p className="font-semibold text-gray-800">{fmtDateTime(invoice.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Cashier</span>
              <p className="font-semibold text-gray-800">{invoice.created_by_name}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Visit #</span>
              <p className="font-mono font-semibold text-gray-800">{v.visit_number || '—'}</p>
            </div>
          </div>

          {/* Patient */}
          <div className="px-8 py-4 border-b border-gray-100">
            <span className="text-gray-400 text-xs uppercase tracking-wide">Patient</span>
            <p className="font-semibold text-gray-800 mt-0.5">{fullName}</p>
            <p className="text-sm text-gray-500 font-mono">{p.patient_id}</p>
          </div>

          {/* Line items */}
          <div className="px-8 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs text-gray-400 uppercase font-semibold">Description</th>
                  <th className="text-left py-2 text-xs text-gray-400 uppercase font-semibold">Type</th>
                  <th className="text-right py-2 text-xs text-gray-400 uppercase font-semibold">Qty</th>
                  <th className="text-right py-2 text-xs text-gray-400 uppercase font-semibold">Unit</th>
                  <th className="text-right py-2 text-xs text-gray-400 uppercase font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    <td className="py-1.5 pr-2">{item.description}</td>
                    <td className="py-1.5 pr-2 text-xs text-gray-400">
                      {SERVICE_TYPE_LABELS[item.reference_type] || item.reference_type}
                    </td>
                    <td className="py-1.5 text-right">{item.quantity}</td>
                    <td className="py-1.5 text-right text-gray-500">{fmtTZS(item.unit_price)}</td>
                    <td className="py-1.5 text-right font-medium">{fmtTZS(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-8 py-4 border-t border-gray-200 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{fmtTZS(invoice.subtotal)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Discount</span>
                <span>− {fmtTZS(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
              <span>TOTAL</span>
              <span>{fmtTZS(invoice.total_amount)}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          {payments.length > 0 && (
            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/50 text-sm">
              <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Payment</p>
              <div className="space-y-1">
                {cashTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash</span>
                    <span className="font-medium">{fmtTZS(cashTotal)}</span>
                  </div>
                )}
                {mobileTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile Money</span>
                    <span className="font-medium">{fmtTZS(mobileTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
                  <span>Total Paid</span>
                  <span>{fmtTZS(invoice.amount_paid)}</span>
                </div>
                {invoice.balance_due > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Balance Due</span>
                    <span>{fmtTZS(invoice.balance_due)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Thank you footer */}
          <div className="text-center px-8 py-6 border-t border-gray-200">
            <p className="text-gray-500 text-sm italic">Thank you for your visit.</p>
            <p className="text-gray-400 text-xs mt-1">Please keep this receipt for your records.</p>
            <div className="mt-4 border-t border-dashed border-gray-200 pt-4 text-xs text-gray-300">
              {fmtDate(invoice.created_at)} · {FACILITY_NAME}
            </div>
          </div>
        </div>
      </div>

      {/* ── Print-specific overrides ── */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A5; }
          body { background: white !important; }
          #receipt {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </>
  );
}
