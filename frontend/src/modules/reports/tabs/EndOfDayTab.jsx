import { useState, useRef } from 'react';
import { Printer, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { reportsService } from '../../../services/reportsService';
import { today, fmtTZS } from '../utils';

const FACILITY_NAME = 'Clinic Management System';

function SummaryCard({ label, value, color }) {
  return (
    <div className={`rounded-lg p-4 text-center ${color || 'bg-gray-50'}`}>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

export default function EndOfDayTab() {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(false);
  const printRef = useRef();

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await reportsService.getCashierDailySummary(date);
      setReport(data);
      setGenerated(true);
    } catch {
      setError('Failed to fetch daily summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const generatedAt = new Date().toLocaleString('en-TZ', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const cashTotal = report?.summary?.total_cash_tzs ?? 0;
  const mobileTotal = report?.summary?.total_mobile_money_tzs ?? 0;

  // Group payments by method for the collections table
  const paymentsByMethod = (report?.payments || []).reduce((acc, p) => {
    acc[p.method] = acc[p.method] || { count: 0, total: 0 };
    acc[p.method].count += 1;
    acc[p.method].total += p.amount_tzs;
    return acc;
  }, {});

  const displayDate = new Date(date).toLocaleDateString('en-TZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      {/* Print styles — hides everything except #print-report */}
      <style>{`
        @media print {
          body > * { visibility: hidden; }
          #print-report, #print-report * { visibility: visible; }
          #print-report { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Controls */}
        <div className="no-print flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            End-of-Day Cashier Report
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setGenerated(false); setReport(null); }}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-dark transition disabled:opacity-60 font-medium"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            {generated && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition font-medium"
              >
                <Printer className="w-4 h-4" />
                Print Report
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="no-print bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Loading placeholder */}
        {loading && (
          <div className="no-print bg-white rounded-lg shadow-sm p-16 flex flex-col items-center gap-3 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Generating report for {displayDate}…</p>
          </div>
        )}

        {/* Report body */}
        {generated && report && (
          <div id="print-report" ref={printRef} className="bg-white rounded-lg shadow-sm">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{FACILITY_NAME}</h1>
                  <p className="text-base font-semibold text-gray-600 mt-1">Daily Cashier Report</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p className="font-semibold text-gray-700">{displayDate}</p>
                  <p className="mt-1">Generated: {generatedAt}</p>
                  <p>By: {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</p>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 space-y-8">
              {/* Invoice summary cards */}
              <div>
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Invoice Summary
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard label="Total Invoices" value={report.summary.total_invoices} />
                  <SummaryCard
                    label="Paid"
                    value={report.summary.paid}
                    color="bg-green-50"
                  />
                  <SummaryCard
                    label="Pending"
                    value={report.summary.pending}
                    color="bg-amber-50"
                  />
                  <SummaryCard
                    label="Cancelled"
                    value={report.summary.cancelled}
                    color="bg-red-50"
                  />
                </div>
              </div>

              {/* Collections by method */}
              <div>
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Collections Summary
                </h2>
                <table className="min-w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left">Payment Method</th>
                      <th className="px-5 py-3 text-right">Transactions</th>
                      <th className="px-5 py-3 text-right">Total (TZS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-5 py-3 font-medium">Cash</td>
                      <td className="px-5 py-3 text-right">
                        {paymentsByMethod['CASH']?.count ?? 0}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">
                        {fmtTZS(cashTotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-medium">Mobile Money</td>
                      <td className="px-5 py-3 text-right">
                        {paymentsByMethod['MOBILE_MONEY']?.count ?? 0}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">
                        {fmtTZS(mobileTotal)}
                      </td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-5 py-3">Grand Total</td>
                      <td className="px-5 py-3 text-right">
                        {(report.payments || []).length}
                      </td>
                      <td className="px-5 py-3 text-right text-primary text-base">
                        {fmtTZS(cashTotal + mobileTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Detailed payments */}
              <div>
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Payment Transactions
                </h2>
                {report.payments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No payments recorded for this date.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          <th className="px-4 py-3 text-left">Time</th>
                          <th className="px-4 py-3 text-left">Invoice #</th>
                          <th className="px-4 py-3 text-left">Patient</th>
                          <th className="px-4 py-3 text-right">Amount (TZS)</th>
                          <th className="px-4 py-3 text-center">Method</th>
                          <th className="px-4 py-3 text-left">Cashier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {report.payments.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.time}</td>
                            <td className="px-4 py-3 font-medium text-primary">{p.invoice_number}</td>
                            <td className="px-4 py-3 text-gray-700">{p.patient_name}</td>
                            <td className="px-4 py-3 text-right font-semibold">{fmtTZS(p.amount_tzs)}</td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  p.method === 'CASH'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {p.method === 'MOBILE_MONEY' ? 'Mobile' : 'Cash'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{p.received_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-100 text-xs text-gray-400 text-center">
              {FACILITY_NAME} — Confidential — {displayDate}
            </div>
          </div>
        )}

        {/* Prompt to generate */}
        {!loading && !generated && !error && (
          <div className="bg-white rounded-lg shadow-sm p-16 flex flex-col items-center gap-3 text-gray-400">
            <Download className="w-10 h-10" />
            <p className="text-sm">Select a date and click "Generate Report" to view the end-of-day summary.</p>
          </div>
        )}
      </div>
    </>
  );
}
