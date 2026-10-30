import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, User, CircleHelp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export function HeaderUserDropdown({ onSettings }: { onSettings: (panel: string) => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const [avatar, setAvatar] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setAvatar(null);
    const update = (event: Event) => { controller.abort(); const value = (event as CustomEvent).detail?.avatarData; setAvatar(typeof value === "string" && /^data:image\/webp;base64,/.test(value) ? value : null); };
    window.addEventListener("account-profile-saved", update);
    if (user?.id) fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/dashboard/account`, { credentials: "include", signal: controller.signal }).then(async response => { if (!response.ok) return; const data = await response.json(); if (!controller.signal.aborted) setAvatar(data.avatarData || null); }).catch(() => {});
    return () => { controller.abort(); window.removeEventListener("account-profile-saved", update); };
  }, [user?.id]);
  const name = user?.fullName || user?.email?.split("@")[0] || "User";
  return <div className="dashboard-profile" ref={ref}>
    <button ref={button} className="profile-button" aria-expanded={open} aria-controls="profile-options" onClick={() => setOpen(value => !value)}><span className="profile-avatar">{avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : name[0].toUpperCase()}</span><span className="profile-name">{name}</span><ChevronDown size={14} /></button>
    {open && <div id="profile-options" className="site-menu profile-options"><p>{user?.email}</p>{[["account", "My Account", User], ["account", "Settings", Settings], ["help-support", "Help & Support", CircleHelp]].map(([panel, label, Icon], index) => { const Symbol = Icon as typeof User; return <button key={index} onClick={() => { setOpen(false); onSettings(panel as string); }}><Symbol size={14} /> {label as string}</button>; })}<button onClick={async () => { setOpen(false); await logout(); navigate("/login", { replace: true }); }}><LogOut size={14} /> Log out</button></div>}
  </div>;
}
