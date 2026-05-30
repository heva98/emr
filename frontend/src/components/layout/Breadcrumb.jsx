import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const SEGMENT_LABELS = {
  registration: "Patient Registration",
  new: "New Patient",
  edit: "Edit",
  opd: "OPD / Consultations",
  laboratory: "Laboratory",
  pharmacy: "Pharmacy",
  dispensing: "Dispensing Pharmacy",
  store: "Main Store",
  cashier: "Cashier / Billing",
  rooms: "Room Management",
  reports: "Reports & Analytics",
  admin: "Administration",
  users: "User Management",
};

function labelFor(segment) {
  return SEGMENT_LABELS[segment] ?? segment;
}

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: labelFor(seg),
    to: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-primary transition"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.to} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          {crumb.isLast ? (
            <span className="text-gray-800 font-medium">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.to}
              className="hover:text-primary transition"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
