import { useState } from 'react';
import OverviewTab from './tabs/OverviewTab';
import RevenueTab from './tabs/RevenueTab';
import PatientsTab from './tabs/PatientsTab';
import OpdTab from './tabs/OpdTab';
import LaboratoryTab from './tabs/LaboratoryTab';
import PharmacyTab from './tabs/PharmacyTab';
import EndOfDayTab from './tabs/EndOfDayTab';

const TABS = [
  { id: 'overview',    label: 'Overview',    component: OverviewTab },
  { id: 'revenue',     label: 'Revenue',     component: RevenueTab },
  { id: 'patients',    label: 'Patients',    component: PatientsTab },
  { id: 'opd',         label: 'OPD',         component: OpdTab },
  { id: 'laboratory',  label: 'Laboratory',  component: LaboratoryTab },
  { id: 'pharmacy',    label: 'Pharmacy',    component: PharmacyTab },
  { id: 'end-of-day',  label: 'End-of-Day',  component: EndOfDayTab },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component ?? OverviewTab;

  return (
    <div className="space-y-0">
      {/* Page title */}
      <div className="mb-4 no-print">
        <h1 className="text-xl font-semibold text-gray-800">Reports &amp; Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Operational insights across all modules</p>
      </div>

      {/* Tab navigation */}
      <div className="no-print bg-white rounded-lg shadow-sm mb-6 overflow-x-auto">
        <nav className="flex border-b border-gray-100" data-tabs>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active tab content */}
      <ActiveComponent />
    </div>
  );
}
