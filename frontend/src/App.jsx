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
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/registration" replace />} />

              {/* Patient Registration — specific routes before :id */}
              <Route path="/registration" element={<PatientListPage />} />
              <Route path="/registration/new" element={<PatientRegistrationForm />} />
              <Route path="/registration/:id/edit" element={<PatientRegistrationForm />} />
              <Route path="/registration/:id" element={<PatientDetailPage />} />

              <Route path="/opd" element={<OPDQueuePage />} />
              <Route path="/opd/consultation/:visitId" element={<ConsultationPage />} />
              <Route path="/laboratory" element={<PlaceholderPage title="Laboratory" />} />
              <Route path="/pharmacy/dispensing" element={<PlaceholderPage title="Dispensing Pharmacy" />} />
              <Route path="/pharmacy/store" element={<PlaceholderPage title="Main Store" />} />
              <Route path="/cashier" element={<PlaceholderPage title="Cashier / Billing" />} />
              <Route path="/rooms" element={<PlaceholderPage title="Room Management" />} />
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
