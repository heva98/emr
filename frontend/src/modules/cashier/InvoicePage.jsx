import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Printer, CheckCircle2, Plus, X,
  CreditCard, Smartphone, Banknote, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cashierService } from '../../services/cashierService';
import InvoiceStatusBadge from './components/InvoiceStatusBadge';
import ServiceTypeBadge from './components/ServiceTypeBadge';
import PaymentMethodBadge from './components/PaymentMethodBadge';
import { fmtTZS, fmtDate, fmtDateTime, fmtTime, getAge } from './utils';

const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

// ── Patient info card ─────────────────────────────────────────────────────────
function PatientCard({ patient, visit }) {
  if (!patient) return null;
  const fullName = [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ');
  const age = getAge(patient.date_of_birth);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Patient</p>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm shrink-0 select-none">
          {(patient.first_name?.[0] ?? '') + (patient.last_name?.[0] ?? '')}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{fullName}</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{patient.patient_id}</p>
          {age !== null && (
            <p className="text-xs text-gray-500 mt-0.5">{age} years · {patient.gender}</p>
          )}
        </div>
      </div>
      {visit && (
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Visit #</span>
            <p className="font-mono font-semibold text-gray-700 mt-0.5">{visit.visit_number}</p>
          </div>
          <div>
            <span className="text-gray-400">Visit Date</span>
            <p className="font-semibold text-gray-700 mt-0.5">{fmtDate(visit.visit_date)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Line items table ──────────────────────────────────────────────────────────
function LineItemsTable({ invoice, onRemove, onAdd, onDiscountChange, editable }) {
  const [newItem, setNewItem] = useState({ description: '', unit_price: '', quantity: '1' });
  const [adding, setAdding] = useState(false);
  const [discountVal, setDiscountVal] = useState(String(invoice?.discount_amount ?? 0));

  // Keep discount input in sync when invoice changes from outside
  useEffect(() => {
    setDiscountVal(String(invoice?.discount_amount ?? 0));
  }, [invoice?.discount_amount]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.description.trim() || !newItem.unit_price) return;
    setAdding(true);
    try {
      await onAdd({
        description: newItem.description.trim(),
        unit_price: parseInt(newItem.unit_price, 10),
        quantity: parseInt(newItem.quantity, 10) || 1,
        reference_type: 'MANUAL',
      });
      setNewItem({ description: '', unit_price: '', quantity: '1' });
    } finally {
      setAdding(false);
    }
  };

  const handleDiscountBlur = () => {
    const val = Math.max(0, parseInt(discountVal, 10) || 0);
    setDiscountVal(String(val));
    if (val !== invoice.discount_amount) {
      onDiscountChange(val);
    }
  };

  const items = invoice?.items ?? [];
  const isDraft = invoice?.status === 'DRAFT';
  const canEdit = editable && invoice?.status !== 'CANCELLED';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Invoice meta */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <span>
          <span className="font-semibold text-gray-600">Invoice: </span>
          <span className="font-mono">{invoice?.invoice_number}</span>
        </span>
        <span>
          <span className="font-semibold text-gray-600">Date: </span>
          {fmtDateTime(invoice?.created_at)}
        </span>
        <span>
          <span className="font-semibold text-gray-600">Created by: </span>
          {invoice?.created_by_name}
        </span>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase w-8">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Description</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase">Qty</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase whitespace-nowrap">Unit Price</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase">Subtotal</th>
              {isDraft && <th className="w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-xs">
                  No items yet. Items are added automatically when generating the invoice.
                </td>
              </tr>
            )}
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                <td className="px-4 py-2.5 text-gray-700">{item.description}</td>
                <td className="px-4 py-2.5">
                  <ServiceTypeBadge type={item.reference_type} />
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity}</td>
                <td className="px-4 py-2.5 text-right text-gray-600 whitespace-nowrap">{fmtTZS(item.unit_price)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-800 whitespace-nowrap">{fmtTZS(item.subtotal)}</td>
                {isDraft && (
                  <td className="px-2 py-2.5 text-right">
                    <button
                      onClick={() => onRemove(item.id)}
                      title="Remove item"
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {/* Add item row */}
            {canEdit && (
              <tr className="bg-gray-50/60 border-t border-dashed border-gray-200">
                <td className="px-4 py-2.5 text-xs text-gray-300">+</td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                    className={`${inp} w-full`}
                  />
                </td>
                <td className="px-2 py-2">
                  <span className="text-xs text-gray-400">Manual</span>
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                    className={`${inp} w-16 text-right`}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    type="number"
                    min="0"
                    placeholder="Price"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem((p) => ({ ...p, unit_price: e.target.value }))}
                    className={`${inp} w-28 text-right`}
                  />
                </td>
                <td className="px-2 py-2 text-right" colSpan={isDraft ? 2 : 1}>
                  <button
                    onClick={handleAdd}
                    disabled={adding || !newItem.description.trim() || !newItem.unit_price}
                    className="inline-flex items-center gap-1 text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" />
                    {adding ? 'Adding…' : 'Add'}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-100 px-4 py-3 space-y-2">
        {/* Discount row */}
        {canEdit ? (
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-gray-500 font-medium shrink-0">Discount (TZS)</label>
            <input
              type="number"
              min="0"
              value={discountVal}
              onChange={(e) => setDiscountVal(e.target.value)}
              onBlur={handleDiscountBlur}
              className={`${inp} w-36 text-right`}
            />
          </div>
        ) : invoice?.discount_amount > 0 ? (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Discount</span>
            <span>− {fmtTZS(invoice.discount_amount)}</span>
          </div>
        ) : null}

        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span>{fmtTZS(invoice?.subtotal)}</span>
        </div>
        {(invoice?.discount_amount > 0 || canEdit) && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>− Discount</span>
            <span className="text-red-500">− {fmtTZS(invoice?.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-1">
          <span className="font-bold text-gray-800">TOTAL</span>
          <span className="text-xl font-bold text-primary">{fmtTZS(invoice?.total_amount)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Payment panel ─────────────────────────────────────────────────────────────
function PaymentPanel({ invoice, onPaymentRecorded, onPrint }) {
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [mobileRef, setMobileRef] = useState('');
  const [loading, setLoading] = useState(false);

  const balanceDue = invoice?.balance_due ?? 0;
  const isPaid = invoice?.status === 'PAID';

  // Pre-fill amount when balance_due changes
  useEffect(() => {
    if (balanceDue > 0) setAmount(String(balanceDue));
  }, [balanceDue]);

  const handlePay = async (e) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount, 10);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Enter a valid payment amount.');
      return;
    }
    setLoading(true);
    try {
      await cashierService.recordPayment(invoice.id, {
        amount: parsedAmount,
        payment_method: method,
        mobile_money_reference: method === 'MOBILE_MONEY' ? mobileRef : '',
      });
      setMobileRef('');
      await onPaymentRecorded();
      toast.success('Payment recorded.');
    } catch (err) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Failed to record payment.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const payments = invoice?.payments ?? [];
  const cashTotal = payments.filter((p) => p.payment_method === 'CASH').reduce((s, p) => s + p.amount, 0);
  const mobileTotal = payments.filter((p) => p.payment_method === 'MOBILE_MONEY').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Balance due */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Balance Due</p>
        <p className={`text-3xl font-bold ${balanceDue > 0 ? 'text-red-500' : 'text-green-600'}`}>
          {fmtTZS(balanceDue)}
        </p>
        {payments.length > 0 && (
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
            {cashTotal > 0 && <span>Cash: {fmtTZS(cashTotal)}</span>}
            {mobileTotal > 0 && <span>Mobile: {fmtTZS(mobileTotal)}</span>}
          </div>
        )}
      </div>

      {/* PAID banner */}
      {isPaid && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Paid in Full</p>
            <p className="text-xs text-green-600 mt-0.5">This invoice has been fully settled.</p>
          </div>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="px-4 pt-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
            Payment History
          </p>
          <ul className="divide-y divide-gray-50">
            {payments.map((p) => (
              <li key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                <PaymentMethodBadge method={p.payment_method} />
                <span className="font-semibold text-gray-800 text-sm">{fmtTZS(p.amount)}</span>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500">{fmtTime(p.received_at)}</p>
                  <p className="text-xs text-gray-400">{p.received_by_name}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Record Payment form */}
      {!isPaid && balanceDue > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Record Payment</p>
          <form onSubmit={handlePay} className="space-y-3">
            {/* Method toggle */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'CASH', label: 'Cash', Icon: Banknote },
                { value: 'MOBILE_MONEY', label: 'Mobile Money', Icon: Smartphone },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    method === value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (TZS)</label>
              <input
                type="number"
                min="1"
                max={balanceDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={`${inp} w-full text-right font-semibold`}
              />
            </div>

            {/* Mobile money ref */}
            {method === 'MOBILE_MONEY' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Mobile Money Reference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={mobileRef}
                  onChange={(e) => setMobileRef(e.target.value)}
                  required
                  placeholder="Transaction reference"
                  className={`${inp} w-full`}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm"
            >
              {loading ? 'Processing…' : 'Record Payment'}
            </button>
          </form>
        </div>
      )}

      {/* Print receipt */}
      <button
        onClick={onPrint}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:border-primary hover:text-primary text-sm font-medium transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print Receipt
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInvoice = useCallback(async () => {
    try {
      const res = await cashierService.getInvoice(id);
      setInvoice(res.data);
    } catch {
      toast.error('Failed to load invoice.');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadInvoice().finally(() => setLoading(false));
  }, [loadInvoice]);

  const handleAddItem = async (data) => {
    const res = await cashierService.addItem(id, data);
    setInvoice(res.data);
  };

  const handleRemoveItem = async (iid) => {
    try {
      const res = await cashierService.removeItem(id, iid);
      setInvoice(res.data);
      toast.success('Item removed.');
    } catch {
      toast.error('Failed to remove item.');
    }
  };

  const handleDiscountChange = async (val) => {
    try {
      const res = await cashierService.updateInvoice(id, { discount_amount: val });
      setInvoice(res.data);
      toast.success('Discount updated.');
    } catch {
      toast.error('Failed to update discount.');
    }
  };

  const handlePaymentRecorded = async () => {
    await loadInvoice();
  };

  const handlePrint = () => {
    window.open(`/cashier/invoice/${id}/receipt`, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="flex gap-5">
          <div className="flex-[6] space-y-4">
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
          <div className="flex-[4] space-y-4">
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const editable = !['PAID', 'CANCELLED'].includes(invoice.status);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/cashier')}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 font-mono">{invoice.invoice_number}</h1>
        <InvoiceStatusBadge status={invoice.status} />
        <div className="flex-1" />
        <div className="text-sm text-gray-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {fmtDateTime(invoice.created_at)}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT — invoice details */}
        <div className="w-full lg:flex-[6] space-y-4 min-w-0">
          <PatientCard patient={invoice.patient_detail} visit={invoice.visit_detail} />
          <LineItemsTable
            invoice={invoice}
            editable={editable}
            onAdd={handleAddItem}
            onRemove={handleRemoveItem}
            onDiscountChange={handleDiscountChange}
          />
        </div>

        {/* RIGHT — payment panel */}
        <div className="w-full lg:flex-[4] min-w-0 lg:sticky lg:top-4">
          <PaymentPanel
            invoice={invoice}
            onPaymentRecorded={handlePaymentRecorded}
            onPrint={handlePrint}
          />
        </div>
      </div>
    </div>
  );
}
