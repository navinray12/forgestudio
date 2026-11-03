import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
export function DashboardSettings({ panel, onClose }: { panel: string; onClose: () => void }) {
  const { user, checkAuth } = useAuth();
  const [name, setName] = useState(user?.fullName || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement; dialog.current?.showModal(); return () => { previous?.focus(); }; }, []);
  return <dialog ref={dialog} className="create-modal dashboard-settings-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }} aria-labelledby="settings-title">
    <button className="modal-close" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
    <h2 id="settings-title">{panel === "account" ? "Account settings" : "Help center"}</h2>
    {panel === "account" ? <form onSubmit={async event => {
      event.preventDefault(); setSaving(true); setMessage("");
      try {
        const response = await fetch(`${apiUrl}/api/v1/auth/profile`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: name.trim() }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error?.message || "Unable to save profile.");
        await checkAuth(); setMessage("Profile saved.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save profile."); } finally { setSaving(false); }
    }}><label className="modal-label">Full name<input autoFocus maxLength={120} required value={name} onChange={event => setName(event.target.value)} /></label><p className="modal-description">Email: {user?.email || "Not set"}</p><p role="status">{message}</p><div className="modal-actions"><button className="primary-button" disabled={saving || !name.trim()}>{saving ? "Saving..." : "Save changes"}</button></div></form> : <><p className="modal-description">Open a site to use the visual editor. Website tools provides your existing WordPress connections, imports, exports, team controls, activity logs, and developer tools.</p><a className="primary-button" href="/dashboard/tools">Open website tools</a></>}
  </dialog>;
}
