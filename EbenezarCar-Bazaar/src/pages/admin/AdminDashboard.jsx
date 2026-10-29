import React, { useEffect, useState } from "react";
import { fetchAdminProfile, adminLogin, adminRegister } from "../../services/adminApi";
import { BarChart2, Car, Mail, RefreshCw, CalendarClock, LayoutDashboard } from "lucide-react";
import OverviewTab from "./OverviewTab";
import VehiclesTab from "./VehiclesTab";
import MessagesTab from "./MessagesTab";

const AdminDashboard = () => {
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [admin, setAdmin] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let isMounted = true;
    const hydrateAdmin = async () => {
      if (!token) {
        setAdmin(null);
        setAuthLoading(false);
        return;
      }
      try {
        const response = await fetchAdminProfile();
        if (isMounted) {
          setAdmin(response.admin);
          setAuthLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          localStorage.removeItem("adminToken");
          setToken("");
          setAdmin(null);
          setAuthLoading(false);
        }
      }
    };

    hydrateAdmin();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const onLogout = () => {
    localStorage.removeItem("adminToken");
    setToken("");
    setAdmin(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-surface text-slate-500">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading secure console...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <AdminAuth
        onAuth={(newToken, profile) => {
          localStorage.setItem("adminToken", newToken);
          setToken(newToken);
          setAdmin(profile);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl shadow-sm border border-brand-muted/60">
          <div>
            <h1 className="text-3xl font-heading font-bold text-brand-primary">Admin Console</h1>
            <p className="text-sm text-slate-500 mt-1">Manage inventory, inquiries, and analytics.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold">
                {admin?.name?.charAt(0) || "A"}
              </div>
              <span className="text-sm font-medium text-slate-700">{admin?.name}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-brand-muted/60 px-4 py-2 text-sm font-semibold text-brand-primary hover:border-brand-accent transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
              {[
                { key: "overview", label: "Overview", Icon: BarChart2 },
                { key: "vehicles", label: "Vehicles", Icon: Car },
                { key: "contacts", label: "Messages", Icon: Mail },
                { key: "tradeIns", label: "Trade-Ins", Icon: RefreshCw },
                { key: "hire", label: "Hire Requests", Icon: CalendarClock }
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    activeTab === key
                      ? "bg-brand-primary text-white shadow-md"
                      : "bg-white text-slate-600 border border-brand-muted/60 hover:bg-slate-50 hover:border-brand-accent/50"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {activeTab === "overview" && <OverviewTab />}
            {activeTab === "vehicles" && <VehiclesTab />}
            {activeTab === "contacts" && <MessagesTab type="contacts" />}
            {activeTab === "tradeIns" && <MessagesTab type="tradeIns" />}
            {activeTab === "hire" && <MessagesTab type="hire" />}
          </main>
        </div>
      </div>
    </div>
  );
};

const AdminAuth = ({ onAuth }) => {
  const [mode, setMode] = useState("login");
  const [formState, setFormState] = useState({ name: "", email: "", password: "", registrationKey: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const submit = async (event) => {
    event.preventDefault();
    try {
      setStatus({ state: "loading", message: "" });
      const payload = {
        name: formState.name,
        email: formState.email,
        password: formState.password,
        registrationKey: formState.registrationKey
      };
      const response = mode === "register" ? await adminRegister(payload) : await adminLogin(payload);
      onAuth(response.token, response.admin);
    } catch (error) {
      setStatus({ state: "error", message: error.message || "Unable to authenticate." });
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-brand-muted/60 bg-white p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="mb-8 text-center relative z-10">
          <h1 className="text-3xl font-heading font-bold text-brand-primary">Secure Access</h1>
          <p className="text-sm text-slate-500 mt-2">Sign in to manage Ebenezer Motors.</p>
        </div>

        <div className="mb-6 flex gap-2 rounded-full bg-slate-100 p-1 relative z-10">
          {["login", "register"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setStatus({ state: "idle", message: "" });
              }}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                mode === value 
                  ? "bg-white text-brand-primary shadow-sm" 
                  : "text-slate-500 hover:text-brand-primary"
              }`}
            >
              {value === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form className="space-y-4 relative z-10" onSubmit={submit}>
          {mode === "register" && (
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Full name"
              value={formState.name}
              onChange={(event) => setFormState({ ...formState, name: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none transition-all bg-slate-50/50"
              required
            />
          )}
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email address"
            value={formState.email}
            onChange={(event) => setFormState({ ...formState, email: event.target.value })}
            className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none transition-all bg-slate-50/50"
            required
            autoComplete="username"
          />
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            value={formState.password}
            onChange={(event) => setFormState({ ...formState, password: event.target.value })}
            className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none transition-all bg-slate-50/50"
            required
            autoComplete="current-password"
          />
          {mode === "register" && (
            <input
              id="registrationKey"
              name="registrationKey"
              type="text"
              placeholder="Registration key"
              value={formState.registrationKey}
              onChange={(event) => setFormState({ ...formState, registrationKey: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none transition-all bg-slate-50/50"
              required
            />
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 flex justify-center items-center gap-2 group"
            disabled={status.state === "loading"}
          >
            {status.state === "loading" ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : mode === "login" ? "Access Dashboard" : "Create Account"}
          </button>
          
          {status.state === "error" && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-600 text-center">{status.message}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
