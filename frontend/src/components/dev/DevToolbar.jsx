import { useAuth } from "../../context/AuthContext";

const TEST_USERS = [
  { username: "admin1", label: "ADMIN" },
  { username: "dr_john", label: "DOCTOR" },
  { username: "nurse_grace", label: "NURSE" },
  { username: "lab_peter", label: "LAB TECH" },
  { username: "pharm_hassan", label: "PHARMACIST" },
  { username: "cashier_mary", label: "CASHIER" },
  { username: "reception_ali", label: "RECEPTIONIST" },
];

const PASSWORD = "Test1234!";

export default function DevToolbar() {
  const { user, login } = useAuth();

  // Only render in development builds
  if (!import.meta.env.DEV) return null;

  async function switchUser(username) {
    try {
      await login(username, PASSWORD);
    } catch {
      // silently ignore — user stays logged in as current
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center gap-2 px-4 py-1.5 bg-gray-950 text-xs border-t border-gray-800 overflow-x-auto">
      <span className="text-gray-500 shrink-0">DEV</span>
      <span className="text-gray-600">|</span>
      <span className="font-mono text-amber-400 shrink-0">
        {user?.username ?? "—"} / {user?.role ?? "unauthenticated"}
      </span>
      <span className="text-gray-600">|</span>
      <span className="text-gray-500 shrink-0">Switch:</span>
      {TEST_USERS.map((u) => (
        <button
          key={u.username}
          onClick={() => switchUser(u.username)}
          className={`shrink-0 px-2 py-0.5 rounded transition text-xs ${
            user?.username === u.username
              ? "bg-primary text-white"
              : "bg-gray-800 hover:bg-gray-700 text-gray-300"
          }`}
        >
          {u.label}
        </button>
      ))}
    </div>
  );
}
