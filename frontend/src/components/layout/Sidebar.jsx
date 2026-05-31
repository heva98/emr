import { NavLink } from "react-router-dom";
import {
  Users,
  Stethoscope,
  FlaskConical,
  Pill,
  Package,
  Receipt,
  BedDouble,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const NAV_GROUPS = [
  {
    group: "CLINICAL",
    items: [
      {
        label: "Patient Registration",
        to: "/registration",
        icon: Users,
        roles: ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"],
      },
      {
        label: "OPD / Consultations",
        to: "/opd",
        icon: Stethoscope,
        roles: ["ADMIN", "DOCTOR", "NURSE"],
      },
    ],
  },
  {
    group: "DIAGNOSTIC",
    items: [
      {
        label: "Laboratory",
        to: "/laboratory",
        icon: FlaskConical,
        roles: ["ADMIN", "LAB_TECH"],
      },
    ],
  },
  {
    group: "PHARMACY",
    items: [
      {
        label: "Dispensing Pharmacy",
        to: "/pharmacy/dispensing",
        icon: Pill,
        roles: ["ADMIN", "PHARMACIST"],
      },
      {
        label: "Main Store",
        to: "/pharmacy/store",
        icon: Package,
        roles: ["ADMIN", "PHARMACIST"],
      },
    ],
  },
  {
    group: "FINANCE",
    items: [
      {
        label: "Cashier / Billing",
        to: "/cashier",
        icon: Receipt,
        roles: ["ADMIN", "CASHIER"],
      },
    ],
  },
  {
    group: "ADMINISTRATION",
    items: [
      {
        label: "Room Management",
        to: "/rooms",
        icon: BedDouble,
        roles: ["ADMIN"],
      },
      {
        label: "Reports & Analytics",
        to: "/reports",
        icon: BarChart2,
        roles: ["ADMIN"],
      },
      {
        label: "User Management",
        to: "/admin/users",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const role = user?.role ?? "ADMIN";

  return (
    <aside
      className="fixed left-0 top-14 bottom-0 z-40 flex flex-col bg-sidebar-bg text-sidebar-text transition-all duration-300 overflow-hidden"
      style={{ width: collapsed ? "4rem" : "15rem" }}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center justify-end px-3 py-3 text-sidebar-text hover:text-white hover:bg-white/10 transition shrink-0"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
        {NAV_GROUPS.map(({ group, items }) => {
          const visible = items.filter((item) => item.roles.includes(role));
          if (visible.length === 0) return null;

          return (
            <div key={group} className="mb-1">
              {!collapsed && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {group}
                </p>
              )}
              {visible.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) => {
                    const base =
                      "flex items-center gap-3 py-2.5 text-sm font-medium transition-colors border-solid border-l-[3px]";
                    const layout = collapsed
                      ? "justify-center px-3"
                      : "pl-3 pr-4";
                    const state = isActive
                      ? "bg-primary text-white border-l-white"
                      : "text-sidebar-text hover:bg-white/10 hover:text-white border-l-transparent";
                    return `${base} ${layout} ${state}`;
                  }}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
