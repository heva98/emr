import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Search, LogOut, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const ROLE_BADGE = {
  RECEPTIONIST: "bg-blue-100 text-blue-700",
  DOCTOR: "bg-green-100 text-green-700",
  LAB_TECH: "bg-purple-100 text-purple-700",
  PHARMACIST: "bg-orange-100 text-orange-700",
  CASHIER: "bg-amber-100 text-amber-700",
  ADMIN: "bg-red-100 text-red-700",
};

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

      {/* User info + logout */}
      <div className="ml-auto flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{user?.name ?? "Guest"}</span>
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
