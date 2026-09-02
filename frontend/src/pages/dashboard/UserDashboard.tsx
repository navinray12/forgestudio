import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
<<<<<<< HEAD
import { useAuth } from "../../context/AuthContext";
=======
>>>>>>> 8d95dec (Initial project code)

interface Website {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function UserDashboard() {
  const navigate = useNavigate();
<<<<<<< HEAD
  const { logout } = useAuth();
=======
>>>>>>> 8d95dec (Initial project code)
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [websiteName, setWebsiteName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

<<<<<<< HEAD
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

=======
>>>>>>> 8d95dec (Initial project code)
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/websites`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.websites) {
        setWebsites(data.websites);
      }
    } catch (err) {
      console.error("Failed to fetch websites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!websiteName.trim()) {
      setError("Please enter a website name.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch(`${apiUrl}/api/websites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: websiteName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg =
          data?.error?.message ||
          data?.message ||
          "Failed to create website.";
        setError(errorMsg);
        return;
      }

      setIsModalOpen(false);
      setWebsiteName("");
      // Navigate straight to the website editor
      navigate(`/editor/${data.website.id}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebsite = async () => {
    if (!deleteTargetId) return;

    try {
      setDeleting(true);
      const res = await fetch(`${apiUrl}/api/websites/${deleteTargetId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setWebsites((prev) => prev.filter((w) => w.id !== deleteTargetId));
        setDeleteTargetId(null);
      } else {
        alert("Failed to delete website.");
      }
    } catch (err) {
      console.error("Delete website error:", err);
      alert("Error deleting website.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        {/* Header Action Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              User Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your websites and build without limits.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/subscriptions"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <span>⭐ Manage Subscription</span>
            </Link>

            <button
              onClick={() => {
                setError("");
                setWebsiteName("");
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <span>+ Create New Website</span>
            </button>
<<<<<<< HEAD

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-[0.98]"
            >
              <span>Logout</span>
            </button>
=======
>>>>>>> 8d95dec (Initial project code)
          </div>
        </div>

        {/* Website List Section */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Your Websites</h2>

          {loading ? (
            <div className="mt-6 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-slate-400">
              <p className="text-sm font-medium">Loading websites...</p>
            </div>
          ) : websites.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-xl font-bold">
                🌐
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-800">
                No websites created yet
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Get started by creating your first website. Drag, drop, and edit in seconds.
              </p>
              <button
                onClick={() => {
                  setError("");
                  setWebsiteName("");
                  setIsModalOpen(true);
                }}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Create New Website
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {websites.map((site) => (
                <div
                  key={site.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:shadow-md hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                        {site.status}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(site.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-slate-900 truncate">
                      {site.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 font-mono">
                      /{site.slug}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                      onClick={() => setDeleteTargetId(site.id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
                    >
                      Delete
                    </button>

                    <button
                      onClick={() => navigate(`/editor/${site.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
                    >
                      <span>Open Editor</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= CREATE WEBSITE MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              Create New Website
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter a name for your new website to start building.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 leading-relaxed">
                {error}
                {error.includes("upgrade") && (
                  <div className="mt-2">
                    <Link
                      to="/subscriptions"
                      className="font-bold underline hover:text-red-900"
                    >
                      Click here to upgrade your plan →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="websiteName"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Website Name
                </label>
                <input
                  id="websiteName"
                  type="text"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  placeholder="My New Website"
                  autoFocus
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={creating}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Website"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">
              Delete Website?
            </h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete this website? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWebsite}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Website"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;