import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DevToolbar from "./components/dev/DevToolbar";
import LoginPage from "./pages/LoginPage";
import PatientListPage from "./modules/patients/PatientListPage";
import PatientRegistrationForm from "./modules/patients/PatientRegistrationForm";
import PatientDetailPage from "./modules/patients/PatientDetailPage";
import OPDQueuePage from "./modules/opd/OPDQueuePage";
import ConsultationPage from "./modules/opd/ConsultationPage";
import LabQueuePage from "./modules/laboratory/LabQueuePage";
import LabOrderDetailPage from "./modules/laboratory/LabOrderDetailPage";
import LabResultReport from "./modules/laboratory/LabResultReport";
import DispensingQueuePage from "./modules/pharmacy/dispensing/DispensingQueuePage";
import DispensingDetailPage from "./modules/pharmacy/dispensing/DispensingDetailPage";
import StoreOverviewPage from "./modules/pharmacy/store/StoreOverviewPage";
import ReceiveStockPage from "./modules/pharmacy/store/ReceiveStockPage";
import RoomManagementPage from "./modules/rooms/RoomManagementPage";
import AssignmentsListPage from "./modules/rooms/AssignmentsListPage";
import DepartmentPage from "./modules/rooms/DepartmentPage";
import CashierQueuePage from "./modules/cashier/CashierQueuePage";
import InvoicePage from "./modules/cashier/InvoicePage";
import ReceiptPage from "./modules/cashier/ReceiptPage";
import ServiceCatalogPage from "./modules/cashier/ServiceCatalogPage";

function PlaceholderPage({ title }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-2xl font-semibold text-gray-700">{title}</h1>
      <p className="text-gray-400 mt-1 text-sm">Module coming soon</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — require authentication */}
          <Route element={<ProtectedRoute />}>
            {/* Print pages — protected but no sidebar */}
            <Route path="/laboratory/order/:id/report" element={<LabResultReport />} />
            <Route path="/cashier/invoice/:id/receipt" element={<ReceiptPage />} />

            <Route element={<Layout />}>
              <Route index element={<Navigate to="/registration" replace />} />

              {/* Patient Registration — specific routes before :id */}
              <Route path="/registration" element={<PatientListPage />} />
              <Route path="/registration/new" element={<PatientRegistrationForm />} />
              <Route path="/registration/:id/edit" element={<PatientRegistrationForm />} />
              <Route path="/registration/:id" element={<PatientDetailPage />} />

              <Route path="/opd" element={<OPDQueuePage />} />
              <Route path="/opd/consultation/:visitId" element={<ConsultationPage />} />
              <Route path="/laboratory" element={<LabQueuePage />} />
              <Route path="/laboratory/order/:id" element={<LabOrderDetailPage />} />
              <Route path="/pharmacy/dispensing" element={<DispensingQueuePage />} />
              <Route path="/pharmacy/dispensing/:prescriptionId" element={<DispensingDetailPage />} />
              <Route path="/pharmacy/store" element={<StoreOverviewPage />} />
              <Route path="/pharmacy/store/receive" element={<ReceiveStockPage />} />
              <Route path="/cashier" element={<CashierQueuePage />} />
              <Route path="/cashier/invoice/:id" element={<InvoicePage />} />
              <Route path="/cashier/catalog" element={<ServiceCatalogPage />} />
              <Route path="/rooms" element={<RoomManagementPage />} />
              <Route path="/rooms/assignments" element={<AssignmentsListPage />} />
              <Route path="/rooms/departments" element={<DepartmentPage />} />
              <Route path="/reports" element={<PlaceholderPage title="Reports & Analytics" />} />
              <Route path="/admin/users" element={<PlaceholderPage title="User Management" />} />
            </Route>
          </Route>
        </Routes>

        <DevToolbar />
      </BrowserRouter>
    </AuthProvider>
  );
}
