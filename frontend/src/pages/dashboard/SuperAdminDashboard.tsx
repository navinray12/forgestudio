<<<<<<< HEAD
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Super Admin Dashboard
          </h1>
          <p className="mt-2 text-slate-500">
            Welcome to ForgeStudio Super Admin.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-[0.98]"
        >
          Logout
        </button>
      </div>
=======
function SuperAdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold text-slate-900">
        Super Admin Dashboard
      </h1>

      <p className="mt-2 text-slate-500">
        Welcome to ForgeStudio Super Admin.
      </p>
>>>>>>> 8d95dec (Initial project code)
    </div>
  );
}

export default SuperAdminDashboard;