/**
 * @file Unified Multi-Tenant Dashboard Shell: Persistent header, workspace selector, role navigation, and responsive layout.
 */
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "../../../context/AuthContext";
import {
  LayoutDashboard,
  Globe,
  Settings,
  Shield,
  ShieldAlert,
  Users,
  CreditCard,
  FileCode,
  Layers,
  Activity,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Building2,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface DashboardShellProps {
  title?: string;
  subtitle?: string;
  currentRole?: UserRole;
  activeTab?: string;
  navGroups?: NavGroup[];
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({
  title,
  subtitle,
  activeTab,
  navGroups,
  headerActions,
  children,
}: DashboardShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case "SUPER_ADMIN":
        return {
          label: "Super Admin",
          classes: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
          icon: <ShieldAlert className="w-3.5 h-3.5" />,
        };
      case "ADMIN":
        return {
          label: "Admin",
          classes: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
          icon: <Shield className="w-3.5 h-3.5" />,
        };
      case "USER":
      default:
        return {
          label: "Designer",
          classes: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
          icon: <Sparkles className="w-3.5 h-3.5" />,
        };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const userInitials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  // Check which top-level console is active
  const isUserConsole = location.pathname.startsWith("/dashboard");
  const isAdminConsole = location.pathname.startsWith("/admin");
  const isSuperAdminConsole = location.pathname.startsWith("/super-admin");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* ================= TOPBAR ================= */}
      <header className="sticky top-0 z-40 h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Brand & Workspace */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="md:hidden p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-base shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              F
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                ForgeStudio
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 -mt-1">
                Enterprise Studio
              </span>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-800">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleInfo.classes}`}>
              {roleInfo.icon}
              {roleInfo.label}
            </span>
          </div>
        </div>

        {/* Center: Role Console Switcher (for elevated roles) */}
        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
          <nav className="hidden lg:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isUserConsole
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Designer Studio
            </Link>
            <Link
              to="/admin"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isAdminConsole
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Console
            </Link>
            {user?.role === "SUPER_ADMIN" && (
              <Link
                to="/super-admin"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSuperAdminConsole
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Super Admin
              </Link>
            )}
          </nav>
        )}

        {/* Right: Actions & User Dropdown */}
        <div className="flex items-center gap-3">
          {headerActions}

          {/* User Profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-semibold text-xs flex items-center justify-center">
                {userInitials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">
                  {user?.fullName || user?.email?.split("@")[0] || "User"}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {user?.email || ""}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-800 border border-slate-700 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onMouseLeave={() => setProfileDropdownOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-700/60">
                  <p className="text-xs font-bold text-slate-200">{user?.fullName || "ForgeStudio User"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  <span className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${roleInfo.classes}`}>
                    {roleInfo.label}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/subscriptions"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    Subscription & Plans
                  </Link>
                  {user?.role !== "USER" && (
                    <Link
                      to={user?.role === "SUPER_ADMIN" ? "/super-admin" : "/admin"}
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      Management Console
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-700/60 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= BODY WRAPPER ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================= SIDEBAR (If navGroups provided) ================= */}
        {navGroups && navGroups.length > 0 && (
          <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/50 shrink-0 p-4 space-y-6 overflow-y-auto">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {group.label}
                  </h3>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = item.active || (item.id && activeTab === item.id);
                      if (item.path) {
                        return (
                          <Link
                            key={item.id}
                            to={item.path}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                              isActive
                                ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {item.icon}
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/20 text-indigo-300">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                            isActive
                              ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/20 text-indigo-300">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </aside>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
              <div className="fixed inset-0 z-50 md:hidden flex">
                <div
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div className="relative w-72 max-w-full bg-slate-900 border-r border-slate-800 p-4 flex flex-col space-y-6 overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="font-bold text-sm text-white">Menu</span>
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {navGroups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-1.5">
                      <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {group.label}
                      </h3>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const isActive = item.active || (item.id && activeTab === item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                if (item.onClick) item.onClick();
                                if (item.path) navigate(item.path);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                                isActive
                                  ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {item.icon}
                                <span>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/20 text-indigo-300">
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= MAIN CONTENT AREA ================= */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardShell;
