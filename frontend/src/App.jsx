import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";

function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-700">{title}</h1>
        <p className="text-gray-400 mt-2">Module coming soon</p>
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<PlaceholderPage title="Login" />} />
          <Route path="/dashboard" element={<PlaceholderPage title="EMR Dashboard" />} />
          <Route path="/patients/*" element={<PlaceholderPage title="Patients" />} />
          <Route path="/opd/*" element={<PlaceholderPage title="OPD / Consultation" />} />
          <Route path="/laboratory/*" element={<PlaceholderPage title="Laboratory" />} />
          <Route path="/pharmacy/*" element={<PlaceholderPage title="Pharmacy" />} />
          <Route path="/cashier/*" element={<PlaceholderPage title="Cashier / Billing" />} />
          <Route path="/rooms/*" element={<PlaceholderPage title="Rooms & Doctors" />} />
          <Route path="/reports/*" element={<PlaceholderPage title="Reports" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
