import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Search, LogOut, X, Bell, CheckCheck, AlertTriangle, Package, Clock, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { notificationService } from "../../services/notificationService";

const ROLE_BADGE = {
  RECEPTIONIST: "bg-blue-100 text-blue-700",
  DOCTOR: "bg-green-100 text-green-700",
  LAB_TECH: "bg-purple-100 text-purple-700",
  PHARMACIST: "bg-orange-100 text-orange-700",
  CASHIER: "bg-amber-100 text-amber-700",
  ADMIN: "bg-red-100 text-red-700",
};

const NOTIF_ICON = {
  CRITICAL_LAB: <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />,
  LOW_STOCK:    <Package className="w-4 h-4 text-amber-500 shrink-0" />,
  LONG_WAIT:    <Clock className="w-4 h-4 text-orange-500 shrink-0" />,
  INFO:         <Info className="w-4 h-4 text-blue-500 shrink-0" />,
};

function fmtAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short' });
}

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef(null);

  const unread = notifications.filter((n) => !n.is_read).length;

  const fetchNotifs = async () => {
    try {
      const { data } = await notificationService.list();
      setNotifications(data.slice(0, 20));
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* silent */ }
    setMarkingAll(false);
  };

  const preview = notifications.slice(0, 5);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-md transition"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">
              Notifications {unread > 0 && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{unread} new</span>}
            </p>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {preview.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No notifications yet
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {preview.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={`px-4 py-3 flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !n.is_read ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {NOTIF_ICON[n.notification_type] ?? NOTIF_ICON.INFO}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${!n.is_read ? "text-gray-800 font-medium" : "text-gray-600"}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{fmtAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function TopHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/patients/search/?q=${encodeURIComponent(query)}`);
        const list = (data.results ?? data).slice(0, 5);
        setResults(list);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleResultClick(patient) {
    setQuery("");
    setShowDropdown(false);
    navigate(`/registration/${patient.id}`);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  }

  const roleBadgeClass = ROLE_BADGE[user?.role] ?? "bg-gray-100 text-gray-700";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 w-60 shrink-0">
        <Building2 className="text-primary w-6 h-6 shrink-0" />
        <span className="text-primary font-bold text-lg tracking-tight">CareEMR</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xl relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search patient by name, ID or phone..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {showDropdown && results.length > 0 && (
          <ul className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {results.map((patient) => (
              <li
                key={patient.id}
                onClick={() => handleResultClick(patient)}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer group"
              >
                <span className="text-sm font-medium text-gray-800 group-hover:text-primary">
                  {patient.name}
                </span>
                <span className="text-xs text-gray-500">
                  {patient.patient_id} &middot; {patient.age}y
                  {patient.gender && <> &middot; {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender}</>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {showDropdown && query.length >= 3 && results.length === 0 && !loading && (
          <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 px-4 py-3 text-sm text-gray-500">
            No patients found for &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* Right section: notifications + user */}
      <div className="ml-auto flex items-center gap-3 shrink-0">
        <NotificationBell />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{user?.name ?? user?.full_name ?? "Guest"}</span>
          {user?.role && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass}`}>
              {user.role.replace("_", " ")}
            </span>
          )}
        </div>
        <button
          onClick={logout}
          title="Logout"
          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
