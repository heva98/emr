import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/layout/Layout";

function PlaceholderPage({ title }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-2xl font-semibold text-gray-700">{title}</h1>
      <p className="text-gray-400 mt-1 text-sm">Module coming soon</p>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-page-bg">
      <div className="bg-white rounded-xl shadow-sm p-10 text-center w-80">
        <span className="text-primary font-bold text-2xl tracking-tight">CareEMR</span>
        <h2 className="text-lg font-semibold text-gray-700 mt-4">Login Page</h2>
        <p className="text-gray-400 text-sm mt-1">Authentication coming soon</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<Layout />}>
            <Route index element={<Navigate to="/registration" replace />} />
            <Route path="/registration" element={<PlaceholderPage title="Patient Registration" />} />
            <Route path="/registration/:id" element={<PlaceholderPage title="Patient Record" />} />
            <Route path="/opd" element={<PlaceholderPage title="OPD / Consultations" />} />
            <Route path="/laboratory" element={<PlaceholderPage title="Laboratory" />} />
            <Route path="/pharmacy/dispensing" element={<PlaceholderPage title="Dispensing Pharmacy" />} />
            <Route path="/pharmacy/store" element={<PlaceholderPage title="Main Store" />} />
            <Route path="/cashier" element={<PlaceholderPage title="Cashier / Billing" />} />
            <Route path="/rooms" element={<PlaceholderPage title="Room Management" />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports & Analytics" />} />
            <Route path="/admin/users" element={<PlaceholderPage title="User Management" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
