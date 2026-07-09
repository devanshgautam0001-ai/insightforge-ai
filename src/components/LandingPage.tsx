import React, { useState } from "react";
import {
  Sparkles,
  Shield,
  Activity,
  Zap,
  CheckCircle,
  HelpCircle,
  Mail,
  Lock,
  User as UserIcon,
  Briefcase,
  Globe,
  ArrowRight,
  FileText,
  Star,
  Database,
  Brain,
  Eye,
  LineChart,
  MessageSquare,
  Cpu,
  Check,
  Send,
  Users,
  LockKeyhole
} from "lucide-react";
import { useAuth } from "../lib/auth.tsx";

export default function LandingPage() {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    forgotPassword,
  } = useAuth();

  // Mode: "landing", "login", "register", "forgot", "demo"
  const [authMode, setAuthMode] = useState<"landing" | "login" | "register" | "forgot">("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Demo request / Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactReferenceId, setContactReferenceId] = useState("");

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete authentication.");
    } finally {
      setLoading(false);
    }
  };

  const getFriendlyAuthErrorMessage = (error: any): string => {
    const code = error?.code || "";
    const msg = error?.message || "";
    if (code === "auth/operation-not-allowed" || msg.includes("auth/operation-not-allowed")) {
      return "Email/Password sign-in is currently disabled in your Firebase project.\n\nPlease enable Email/Password in the Firebase Console and try again.";
    }
    if (code === "auth/email-already-in-use" || msg.includes("auth/email-already-in-use")) {
      return "An account with this email address already exists on InsightForge.";
    }
    if (code === "auth/weak-password" || msg.includes("auth/weak-password")) {
      return "Password is too weak. Please ensure it follows the security password policy.";
    }
    if (code === "auth/invalid-email" || msg.includes("auth/invalid-email")) {
      return "Invalid email address format. Please check the spelling.";
    }
    if (code === "auth/network-request-failed" || msg.includes("auth/network-request-failed")) {
      return "Network error. Please check your internet connection and try again.";
    }
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      msg.includes("auth/invalid-credential") ||
      msg.includes("auth/wrong-password") ||
      msg.includes("auth/user-not-found")
    ) {
      return "Incorrect email or password. Please verify your credentials.";
    }
    return error.message || "An authentication error occurred.";
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (authMode === "login") {
        await loginWithEmail(email, password, rememberMe);
      } else if (authMode === "register") {
        if (!name.trim()) {
          throw new Error("Please enter your full name.");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters long.");
        }
        if (!/[A-Z]/.test(password)) {
          throw new Error("Password must contain at least one uppercase letter (A-Z).");
        }
        if (!/[a-z]/.test(password)) {
          throw new Error("Password must contain at least one lowercase letter (a-z).");
        }
        if (!/[0-9]/.test(password)) {
          throw new Error("Password must contain at least one number (0-9).");
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          throw new Error("Password must contain at least one special character (e.g. !, @, #, $, %, etc.).");
        }
        await registerWithEmail(email, password, name);
        setSuccessMsg("Account registered successfully! A secure verification email has been sent. Please verify your email first, then proceed to Log In.");
        setAuthMode("login");
        setPassword("");
      } else if (authMode === "forgot") {
        if (!email.trim()) {
          throw new Error("Please enter your email address first.");
        }
        await forgotPassword(email);
        setSuccessMsg("If this account exists, a secure password reset link was dispatched. Please check your inbox.");
      }
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };



  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError("");
    setContactSuccess(false);

    const emailTrimmed = contactEmail.trim();
    if (!contactName.trim()) {
      setContactError("Name is required.");
      return;
    }
    if (!emailTrimmed) {
      setContactError("Corporate Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setContactError("Please enter a valid Corporate Email address.");
      return;
    }
    if (!contactCompany.trim()) {
      setContactError("Company is required.");
      return;
    }
    if (!contactMessage.trim()) {
      setContactError("Inquiry details are required.");
      return;
    }

    setContactSubmitting(true);

    try {
      const response = await fetch("/api/contact/request-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName.trim(),
          email: emailTrimmed,
          company: contactCompany.trim(),
          message: contactMessage.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      setContactReferenceId(data.referenceId || "IF-UNKNOWN");
      setContactSuccess(true);
      
      // Clear fields on successful transmission
      setContactName("");
      setContactEmail("");
      setContactCompany("");
      setContactMessage("");
    } catch (err: any) {
      setContactError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setContactSubmitting(false);
    }
  };

  // Render Authentication Modal Mode
  if (authMode !== "landing") {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center relative p-6 overflow-hidden select-none">
        {/* Ambient gold glow backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#F5B942]/5 rounded-full blur-[140px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-[#F5B942]/3 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#12141B] border border-[#262A35] rounded-lg p-8 shadow-2xl relative z-10 bracket-card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5B942]/10 text-[#F5B942] rounded-sm text-[10px] font-mono uppercase font-bold tracking-wider mb-4 border border-[#F5B942]/20">
              <Sparkles className="w-3 h-3 animate-pulse" />
              InsightForge™ Platform Sec
            </div>
            <h2 className="text-xl font-display font-bold text-[#EDEEF2] tracking-tight uppercase">
              {authMode === "login" && "Access Workspace"}
              {authMode === "register" && "Initialize Session"}
              {authMode === "forgot" && "Recover Token"}
            </h2>
            <p className="text-[#8B92A5] text-[11px] mt-2 font-mono">
              {authMode === "login" && "Enter secure cryptographic auth credentials."}
              {authMode === "register" && "Establish full-spectrum multi-tenant dataset control."}
              {authMode === "forgot" && "Provide registered target email destination."}
            </p>
          </div>

          {errorMsg && (
            <div className="bg-[#F4485C]/10 border border-[#F4485C]/20 text-[#F4485C] rounded-sm p-4 text-[11px] mb-5 text-left whitespace-pre-line leading-relaxed font-mono">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-[#2DD9A8]/10 border border-[#2DD9A8]/20 text-[#2DD9A8] rounded-sm p-3 text-[11px] mb-5 text-center font-mono">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="block text-[#8B92A5] text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4.5 h-4.5 text-[#545B6E]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-[#0A0B0F] border border-[#262A35] rounded-sm py-2 pl-10 pr-4 text-xs text-[#EDEEF2] placeholder-[#545B6E] focus:outline-none focus:border-[#F5B942] transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[#8B92A5] text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-[#545B6E]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@insightforge.com"
                  className="w-full bg-[#0A0B0F] border border-[#262A35] rounded-sm py-2 pl-10 pr-4 text-xs text-[#EDEEF2] placeholder-[#545B6E] focus:outline-none focus:border-[#F5B942] transition"
                />
              </div>
            </div>

            {authMode !== "forgot" && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[#8B92A5] text-[10px] font-mono font-bold uppercase tracking-wider">Secret Phrase</label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => setAuthMode("forgot")}
                      className="text-[10px] font-mono text-[#F5B942] hover:underline"
                    >
                      FORGOT KEY?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-[#545B6E]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0A0B0F] border border-[#262A35] rounded-sm py-2 pl-10 pr-4 text-xs text-[#EDEEF2] placeholder-[#545B6E] focus:outline-none focus:border-[#F5B942] transition"
                  />
                </div>
                
                {authMode === "login" && (
                  <div className="flex items-center gap-2 mt-3 select-none">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 bg-[#0A0B0F] border border-[#262A35] rounded-sm focus:ring-0 text-[#F5B942] cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-[10px] font-mono text-[#8B92A5] cursor-pointer hover:text-[#EDEEF2]">
                      REMEMBER TERMINAL PERSISTENCE
                    </label>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F5B942] hover:bg-[#F5B942]/90 disabled:bg-[#F5B942]/50 text-[#0A0B0F] font-mono font-bold text-xs py-2.5 rounded-sm transition flex items-center justify-center gap-1.5 mt-2"
            >
              {loading ? "TRANSMITTING..." : authMode === "login" ? "ESTABLISH CONNECTION" : authMode === "register" ? "INITIALIZE REGISTRATION" : "DISPATCH RESET TOKEN"}
            </button>
          </form>

          {authMode !== "forgot" && (
            <>
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-[#262A35]"></div>
                <span className="flex-shrink mx-4 text-[#545B6E] text-[9px] font-mono font-bold uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-[#262A35]"></div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-[#0A0B0F] hover:bg-[#12141B] border border-[#262A35] text-[#EDEEF2] hover:text-white font-mono font-bold text-xs py-2.5 rounded-sm transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-[#F5B942]" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.6-4.53-2.85-6.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                FEDERATED GOOGLE AUTH
              </button>
            </>
          )}

          <div className="text-center mt-6 text-[10px] font-mono text-[#8B92A5] space-y-2">
            <div>
              {authMode === "login" && (
                <>
                  NEW ANALYST?{" "}
                  <button onClick={() => setAuthMode("register")} className="text-[#F5B942] font-bold hover:underline">
                    CREATE ACCOUNT
                  </button>
                </>
              )}
              {authMode === "register" && (
                <>
                  EXISTING TERMINAL OWNER?{" "}
                  <button onClick={() => setAuthMode("login")} className="text-[#F5B942] font-bold hover:underline">
                    LOG IN
                  </button>
                </>
              )}
              {authMode === "forgot" && (
                <button onClick={() => setAuthMode("login")} className="text-[#F5B942] font-bold hover:underline">
                  BACK TO LOGIN
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-[#EDEEF2] font-sans selection:bg-[#F5B942] selection:text-[#0A0B0F] relative overflow-x-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F5B942]/3 rounded-full blur-[160px] pointer-events-none animate-pulse" />
      <div className="absolute top-[800px] left-[-200px] w-[600px] h-[600px] bg-[#F5B942]/2 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="border-b border-[#262A35] bg-[#0A0B0F]/90 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5B942] rounded-sm rotate-45 flex items-center justify-center border border-[#F5B942]/30 shrink-0">
            <div className="w-4 h-4 bg-[#0A0B0F] rounded-sm -rotate-45 flex items-center justify-center font-mono text-[9px] font-black text-[#F5B942]">
              IF
            </div>
          </div>
          <span className="font-display font-black text-sm text-[#EDEEF2] tracking-tighter uppercase">InsightForge™</span>
        </div>

        {/* Desktop Menu links */}
        <div className="hidden md:flex items-center gap-6 font-mono text-[10px] tracking-wider text-[#8B92A5]">
          <a href="#features" className="hover:text-[#F5B942] transition">01. CAPABILITIES</a>
          <a href="#screenshots" className="hover:text-[#F5B942] transition">02. WORKSPACE</a>
          <a href="#pricing" className="hover:text-[#F5B942] transition">03. PLANS</a>
          <a href="#faq" className="hover:text-[#F5B942] transition">04. FAQ</a>
          <a href="#contact" className="hover:text-[#F5B942] transition">05. DEMO</a>
          <div className="w-px h-3 bg-[#262A35]"></div>
          <button
            onClick={() => setAuthMode("login")}
            className="text-[#EDEEF2] hover:text-[#F5B942] transition font-bold"
          >
            SIGN IN
          </button>
          <button
            onClick={() => setAuthMode("register")}
            className="bg-[#F5B942] hover:bg-[#F5B942]/90 text-[#0A0B0F] font-bold px-4 py-2 rounded-sm shadow-md transition"
          >
            GET STARTED
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-8 pt-24 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5B942]/10 text-[#F5B942] rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider mb-6 border border-[#F5B942]/20">
          <Sparkles className="w-3.5 h-3.5" />
          ENTERPRISE-GRADE PREDICTIVE ENGINE
        </div>

        <h1 className="text-4xl md:text-6xl font-display font-extrabold text-[#EDEEF2] tracking-tight leading-none uppercase">
          POLISHED PREDICTIVE ANALYTICS FOR <br />
          <span className="bg-gradient-to-r from-[#F5B942] to-[#EDEEF2] bg-clip-text text-transparent">
            AUTOML & TIME SERIES DATA
          </span>
        </h1>

        <p className="text-[#8B92A5] font-sans text-xs max-w-2xl mx-auto mt-6 leading-relaxed">
          Profile raw high-variance tabular files, trigger automated machine learning pipelines, execute micro-second time-series forecasting, and compose executive AI advisories backed securely by dedicated SQL isolation.
        </p>

        <div className="flex flex-wrap justify-center items-center gap-4 mt-10">
          <button
            onClick={() => setAuthMode("register")}
            className="bg-[#F5B942] hover:bg-[#F5B942]/90 text-[#0A0B0F] font-mono font-bold text-xs px-6 py-3 rounded-sm flex items-center gap-2 shadow-lg transition"
          >
            GET STARTED
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAuthMode("login")}
            className="bg-[#0A0B0F] border border-[#262A35] hover:bg-[#12141B] text-[#EDEEF2] font-mono font-bold text-xs px-6 py-3 rounded-sm transition"
          >
            SIGN IN
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("contact");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-[#12141B] border border-[#262A35] hover:text-[#F5B942] text-[#8B92A5] font-mono text-xs px-6 py-3 rounded-sm transition"
          >
            BOOK DEMO
          </button>
        </div>
      </header>

      {/* Screenshots / Workspace Preview Section */}
      <section id="screenshots" className="max-w-6xl mx-auto px-8 py-12 relative">
        <div className="border border-[#262A35] bg-[#12141B] rounded-sm p-3 relative shadow-2xl overflow-hidden bracket-card">
          {/* Simulated Workspace Header */}
          <div className="flex items-center justify-between border-b border-[#262A35] pb-3 mb-4 font-mono text-[10px] text-[#8B92A5]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F4485C]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#2DD9A8]" />
              <span className="ml-2 text-[#EDEEF2] font-bold">INSIGHTFORGE CORE DECK v2.6.4</span>
            </div>
            <div className="flex items-center gap-3">
              <span>PROJECT: ENTERPRISE_SECURE_REPLICA</span>
              <span className="bg-[#F5B942]/10 text-[#F5B942] px-2 py-0.5 rounded-sm">SUPER_ADMIN ACTIVE</span>
            </div>
          </div>

          {/* Screenshot layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Left Nav */}
            <div className="bg-[#0A0B0F] border border-[#262A35] p-3 rounded-sm space-y-2 font-mono text-[9px] text-[#8B92A5]">
              <div className="text-[#EDEEF2] font-bold pb-1 border-b border-[#262A35]/50">NAVIGATION</div>
              <div className="flex items-center gap-1.5 text-[#F5B942] bg-[#F5B942]/5 p-1 rounded-sm"><Database className="w-3.5 h-3.5" /> 01. PREPROCESSING</div>
              <div className="flex items-center gap-1.5 p-1"><Brain className="w-3.5 h-3.5" /> 02. AUTOML STUDIO</div>
              <div className="flex items-center gap-1.5 p-1"><LineChart className="w-3.5 h-3.5" /> 03. TIMESERIES FORECAST</div>
              <div className="flex items-center gap-1.5 p-1"><MessageSquare className="w-3.5 h-3.5" /> 04. AI DATA COPILOT</div>
              <div className="flex items-center gap-1.5 p-1"><Cpu className="w-3.5 h-3.5" /> 05. CORE TELEMETRY</div>
            </div>

            {/* Middle Main */}
            <div className="md:col-span-3 bg-[#0A0B0F] border border-[#262A35] p-4 rounded-sm space-y-4">
              <div className="flex justify-between items-start border-b border-[#262A35]/50 pb-2.5">
                <div>
                  <h3 className="font-display font-extrabold text-xs text-[#EDEEF2] uppercase">Automated Intelligence Studio</h3>
                  <p className="text-[9px] text-[#8B92A5] font-mono mt-0.5">Continuous training array synchronized over PostgreSQL</p>
                </div>
                <div className="text-right font-mono text-[9px]">
                  <span className="text-[#8B92A5]">ACCURACY: </span>
                  <span className="text-[#2DD9A8] font-bold">98.42% [HIGH]</span>
                </div>
              </div>

              {/* Scorecard */}
              <div className="grid grid-cols-3 gap-3 font-mono text-[10px]">
                <div className="bg-[#12141B] border border-[#262A35] p-2.5 rounded-sm">
                  <span className="text-[#8B92A5] text-[8px] block uppercase">Evaluated Rows</span>
                  <span className="text-[#EDEEF2] font-bold text-sm block mt-1">1,248,500</span>
                  <span className="text-[#2DD9A8] text-[8px] block mt-0.5">▲ +14.5% STREAMING</span>
                </div>
                <div className="bg-[#12141B] border border-[#262A35] p-2.5 rounded-sm">
                  <span className="text-[#8B92A5] text-[8px] block uppercase">Training Epochs</span>
                  <span className="text-[#EDEEF2] font-bold text-sm block mt-1">200 / 200</span>
                  <span className="text-[#F5B942] text-[8px] block mt-0.5">COMPLETED SYSTEM FIT</span>
                </div>
                <div className="bg-[#12141B] border border-[#262A35] p-2.5 rounded-sm">
                  <span className="text-[#8B92A5] text-[8px] block uppercase">Telemetry Health</span>
                  <span className="text-[#EDEEF2] font-bold text-sm block mt-1">99.98%</span>
                  <span className="text-[#2DD9A8] text-[8px] block mt-0.5">● ZERO LOSS PACKETS</span>
                </div>
              </div>

              {/* Progress visualizer */}
              <div className="space-y-1.5 font-mono text-[9px]">
                <div className="flex justify-between text-[#8B92A5]">
                  <span>Optimizing Hyperparameters via Damped Newton Solver</span>
                  <span className="text-[#F5B942]">84% COMPLETED</span>
                </div>
                <div className="w-full bg-[#12141B] border border-[#262A35] h-1.5 rounded-sm overflow-hidden">
                  <div className="bg-[#F5B942] h-full rounded-sm" style={{ width: "84%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features / Capabilities Grid */}
      <section id="features" className="max-w-6xl mx-auto px-8 py-20 border-t border-[#262A35]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#F5B942] font-mono text-[10px] tracking-widest font-bold uppercase">01 / COMPLETE SYSTEM SPECIFICATIONS</span>
          <h2 className="text-2xl font-display font-extrabold text-[#EDEEF2] tracking-tight uppercase mt-2">Enterprise-Grade Architecture</h2>
          <p className="text-[#8B92A5] text-xs mt-2">Pragmatic, high-fidelity analytics and AI integrations without fake data wrappers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-6 hover:border-[#F5B942]/30 transition bracket-card">
            <div className="w-9 h-9 bg-[#F5B942]/10 text-[#F5B942] rounded-sm flex items-center justify-center mb-5">
              <Zap className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-mono font-bold text-[#EDEEF2] uppercase">Dynamic AutoML Leaderboard</h3>
            <p className="text-[#8B92A5] text-xs mt-2.5 leading-relaxed">
              Auto-calculates classification metrics, F1 scores, R² values, confusion matrices, and ROC curves instantly across custom arrays.
            </p>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-6 hover:border-[#F5B942]/30 transition bracket-card">
            <div className="w-9 h-9 bg-[#F5B942]/10 text-[#F5B942] rounded-sm flex items-center justify-center mb-5">
              <Database className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-mono font-bold text-[#EDEEF2] uppercase">Tabular Preprocessing</h3>
            <p className="text-[#8B92A5] text-xs mt-2.5 leading-relaxed">
              Clean structural missing rows, impute numerical means, drop duplicates, and enforce IQR boundaries with a complete preprocessor log.
            </p>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-6 hover:border-[#F5B942]/30 transition bracket-card">
            <div className="w-9 h-9 bg-[#F5B942]/10 text-[#F5B942] rounded-sm flex items-center justify-center mb-5">
              <LineChart className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-mono font-bold text-[#EDEEF2] uppercase">Robust Forecast Projections</h3>
            <p className="text-[#8B92A5] text-xs mt-2.5 leading-relaxed">
              Model confidence intervals, future trends, seasonality patterns, and evaluate daily, weekly, or quarterly forecasting arrays.
            </p>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-6 hover:border-[#F5B942]/30 transition bracket-card">
            <div className="w-9 h-9 bg-[#F5B942]/10 text-[#F5B942] rounded-sm flex items-center justify-center mb-5">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-mono font-bold text-[#EDEEF2] uppercase">Intelligent AI Copilot</h3>
            <p className="text-[#8B92A5] text-xs mt-2.5 leading-relaxed">
              Fully functioning markdown-enabled chat designed to translate complex data structures, explain SHAP drivers, and trigger executive digests.
            </p>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-6 hover:border-[#F5B942]/30 transition bracket-card">
            <div className="w-9 h-9 bg-[#F5B942]/10 text-[#F5B942] rounded-sm flex items-center justify-center mb-5">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-mono font-bold text-[#EDEEF2] uppercase">Telemetry Streaming</h3>
            <p className="text-[#8B92A5] text-xs mt-2.5 leading-relaxed">
              Connect to simulated real-time telemetry pipelines to model continuous sensory frequency, latency spikes, and live alarms.
            </p>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-6 hover:border-[#F5B942]/30 transition bracket-card">
            <div className="w-9 h-9 bg-[#F5B942]/10 text-[#F5B942] rounded-sm flex items-center justify-center mb-5">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-mono font-bold text-[#EDEEF2] uppercase">Complete RBAC Security</h3>
            <p className="text-[#8B92A5] text-xs mt-2.5 leading-relaxed">
              Enforce role-based access controls across SUPER_ADMIN, ADMIN, ANALYST, and VIEWER tiers to maintain high isolation integrity.
            </p>
          </div>
        </div>
      </section>

      {/* Enterprise AI Capabilities Section */}
      <section className="max-w-6xl mx-auto px-8 py-20 border-t border-[#262A35]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[#F5B942] font-mono text-[10px] tracking-widest font-bold uppercase">SECURE ENTERPRISE LAYER</span>
            <h2 className="text-2xl font-display font-black text-[#EDEEF2] uppercase tracking-tight mt-2">
              EXPLAINABLE ML WITH SHAP & LIME PARSING
            </h2>
            <p className="text-[#8B92A5] text-xs mt-4 leading-relaxed">
              InsightForge doesn't treat AI as a black box. Leverage deep local explanation matrices that isolate feature contributions, calculate global rankings, and parse mathematical variance to let compliance teams audit pipeline logic safely.
            </p>

            <ul className="space-y-3.5 mt-8 text-xs text-[#EDEEF2] font-mono">
              <li className="flex items-center gap-3">
                <Check className="w-4.5 h-4.5 text-[#F5B942]" /> Global Feature Rank Modeling
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4.5 h-4.5 text-[#F5B942]" /> Micro-Confidence Interval Estimations
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4.5 h-4.5 text-[#F5B942]" /> Real-time PDF Executive Summaries
              </li>
            </ul>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] p-6 rounded-sm relative">
            <div className="absolute top-4 right-4 bg-[#2DD9A8]/10 text-[#2DD9A8] text-[9px] font-mono px-2.5 py-0.5 rounded-sm">
              COMPLIANT SECURE
            </div>
            <h4 className="font-mono text-xs font-bold text-[#EDEEF2] uppercase pb-3 border-b border-[#262A35]/50">Explainable AI Summary</h4>
            
            <div className="space-y-4 mt-4 font-mono text-[10px]">
              <div>
                <div className="flex justify-between text-[#8B92A5] mb-1">
                  <span>Input: Transaction Velocity</span>
                  <span className="text-[#2DD9A8]">SHAP Value +0.48 (Positive Driver)</span>
                </div>
                <div className="w-full bg-[#0A0B0F] h-2 rounded-sm overflow-hidden">
                  <div className="bg-[#2DD9A8] h-full rounded-sm" style={{ width: "75%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#8B92A5] mb-1">
                  <span>Input: Region Code [APAC]</span>
                  <span className="text-[#F4485C]">SHAP Value -0.12 (Negative Driver)</span>
                </div>
                <div className="w-full bg-[#0A0B0F] h-2 rounded-sm overflow-hidden">
                  <div className="bg-[#F4485C] h-full rounded-sm" style={{ width: "25%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#8B92A5] mb-1">
                  <span>Input: Account Age</span>
                  <span className="text-[#F5B942]">SHAP Value +0.22 (Positive Driver)</span>
                </div>
                <div className="w-full bg-[#0A0B0F] h-2 rounded-sm overflow-hidden">
                  <div className="bg-[#F5B942] h-full rounded-sm" style={{ width: "45%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-8 py-20 border-t border-[#262A35]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#F5B942] font-mono text-[10px] tracking-widest font-bold uppercase">COMMUNITY TRUST</span>
          <h2 className="text-2xl font-display font-extrabold text-[#EDEEF2] uppercase mt-2">Vouched by Analysts</h2>
          <p className="text-[#8B92A5] text-xs mt-2">How leading corporate architects utilize our automated intelligence workspace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#12141B] border border-[#262A35] p-6 rounded-sm">
            <div className="flex gap-1 text-[#F5B942] mb-4">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
            </div>
            <p className="text-[#EDEEF2] text-xs italic">"InsightForge transformed our data pipelines. Being able to clean tabular files, fit AutoML models, and export explainability maps in one single interface saved weeks of custom development."</p>
            <div className="mt-5 font-mono text-[10px]">
              <span className="text-[#EDEEF2] font-bold block">Marcus Chen</span>
              <span className="text-[#8B92A5] block">Director of Data Science, Apex Global</span>
            </div>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] p-6 rounded-sm">
            <div className="flex gap-1 text-[#F5B942] mb-4">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
            </div>
            <p className="text-[#EDEEF2] text-xs italic">"The PostgreSQL backend and complete RBAC integration ensures our compliance standards are fully respected. Having a direct PDF Executive Report generator is brilliant for our corporate presentation."</p>
            <div className="mt-5 font-mono text-[10px]">
              <span className="text-[#EDEEF2] font-bold block">Sarah Jenkins</span>
              <span className="text-[#8B92A5] block">Head of Advanced Analytics, Vanguard Corp</span>
            </div>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] p-6 rounded-sm">
            <div className="flex gap-1 text-[#F5B942] mb-4">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
            </div>
            <p className="text-[#EDEEF2] text-xs italic">"The live telemetry streaming module combined with the AI Copilot makes forecasting exceptionally intuitive. Outstanding design execution and performance metrics."</p>
            <div className="mt-5 font-mono text-[10px]">
              <span className="text-[#EDEEF2] font-bold block">Dr. Robert Kovacs</span>
              <span className="text-[#8B92A5] block">Principal Architect, Intelisys Labs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section id="pricing" className="max-w-5xl mx-auto px-8 py-20 border-t border-[#262A35]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#F5B942] font-mono text-[10px] tracking-widest font-bold uppercase">03 / PRICING PLANS</span>
          <h2 className="text-2xl font-display font-extrabold text-[#EDEEF2] uppercase mt-2">Transparent Subscriptions</h2>
          <p className="text-[#8B92A5] text-xs mt-2">Select a plan suited for individual analysts or corporate departments.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter */}
          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#8B92A5]">Starter Tier</span>
              <h3 className="text-2xl font-display font-bold text-[#EDEEF2] mt-1">$0 <span className="text-xs text-[#545B6E] font-normal">/ month</span></h3>
              <p className="text-[#8B92A5] text-xs mt-2">Verify capabilities and profile minor datasets with zero upfront cost.</p>
              <ul className="space-y-2 mt-6 text-xs text-[#8B92A5] font-mono">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2DD9A8] shrink-0" /> 1 Active Project</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2DD9A8] shrink-0" /> Standard Column Outliers</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2DD9A8] shrink-0" /> Basic Scatter & Line BI</li>
              </ul>
            </div>
            <button
              onClick={() => setAuthMode("register")}
              className="bg-[#0A0B0F] hover:bg-[#12141B] border border-[#262A35] text-[#EDEEF2] font-mono font-bold text-xs py-2.5 rounded-sm w-full transition mt-8"
            >
              INITIALIZE STARTER
            </button>
          </div>

          {/* Professional */}
          <div className="bg-[#12141B] border-2 border-[#F5B942] rounded-sm p-6 flex flex-col justify-between relative shadow-2xl">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#F5B942] text-[#0A0B0F] text-[9px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-sm">
              Featured Plan
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#F5B942]">Professional Tier</span>
              <h3 className="text-2xl font-display font-bold text-[#EDEEF2] mt-1">$49 <span className="text-xs text-[#545B6E] font-normal">/ month</span></h3>
              <p className="text-[#8B92A5] text-xs mt-2">Comprehensive suite for quantitative analyst groups needing automated forecasting.</p>
              <ul className="space-y-2 mt-6 text-xs text-[#8B92A5] font-mono">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F5B942] shrink-0" /> Unlimited Project Profiles</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F5B942] shrink-0" /> Full AutoML Train Models</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F5B942] shrink-0" /> Interactive SHAP Maps</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F5B942] shrink-0" /> AI Executive Recommendations</li>
              </ul>
            </div>
            <button
              onClick={() => setAuthMode("register")}
              className="bg-[#F5B942] hover:bg-[#F5B942]/90 text-[#0A0B0F] font-mono font-bold text-xs py-2.5 rounded-sm w-full shadow-lg transition mt-8"
            >
              DEPLOY PROFESSIONAL
            </button>
          </div>

          {/* Enterprise */}
          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#8B92A5]">Enterprise Tier</span>
              <h3 className="text-2xl font-display font-bold text-[#EDEEF2] mt-1">$199 <span className="text-xs text-[#545B6E] font-normal">/ month</span></h3>
              <p className="text-[#8B92A5] text-xs mt-2">Complete isolated system for departments processing micro-second sensory arrays.</p>
              <ul className="space-y-2 mt-6 text-xs text-[#8B92A5] font-mono">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2DD9A8] shrink-0" /> PostgreSQL Replica Isolation</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2DD9A8] shrink-0" /> Active Member RBAC Controls</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2DD9A8] shrink-0" /> Continuous Telemetry Streaming</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2DD9A8] shrink-0" /> SLA Response Support</li>
              </ul>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById("contact");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-[#0A0B0F] hover:bg-[#12141B] border border-[#262A35] text-[#EDEEF2] font-mono font-bold text-xs py-2.5 rounded-sm w-full transition mt-8"
            >
              CONTACT ADVISORY
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="max-w-4xl mx-auto px-8 py-16 border-t border-[#262A35] text-center">
        <span className="text-[#F5B942] font-mono text-[10px] tracking-widest font-bold uppercase">OUR CRUSADE</span>
        <h2 className="text-2xl font-display font-black text-[#EDEEF2] uppercase mt-2">SECURE PREDICTIVE INTELLIGENCE</h2>
        <p className="text-[#8B92A5] text-xs mt-4 max-w-2xl mx-auto leading-relaxed">
          InsightForge was built by systems architects who believe AI is only as powerful as the trust you put inside it. Our platform compiles state-of-the-art AutoML metrics, explains prediction drivers via local SHAP/LIME logic, and ensures absolute database tenant isolation. We empower Fortune 500 analysts with real data precision.
        </p>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-8 py-20 border-t border-[#262A35]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#F5B942] font-mono text-[10px] tracking-widest font-bold uppercase">04 / FREQUENTLY ANSWERED</span>
          <h2 className="text-2xl font-display font-extrabold text-[#EDEEF2] uppercase tracking-tight mt-2">System Specifications</h2>
          <p className="text-[#8B92A5] text-xs mt-2">Get answers to critical cloud computing security questions.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-5">
            <h4 className="font-mono text-xs font-bold text-[#EDEEF2] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#F5B942]" />
              Is my custom dataset kept strictly isolated?
            </h4>
            <p className="text-[#8B92A5] text-[11px] mt-2.5 leading-relaxed">
              Yes. All arrays and project tables are strictly tied to your Firebase tenant UID on PostgreSQL. Authorized headers block cross-user querying completely.
            </p>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-5">
            <h4 className="font-mono text-xs font-bold text-[#EDEEF2] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#F5B942]" />
              How is the dynamic AutoML scoring executed?
            </h4>
            <p className="text-[#8B92A5] text-[11px] mt-2.5 leading-relaxed">
              Our automated model studio executes mathematical matrix split evaluations, hyperparameter regression tuning, and confusion calculations natively inside isolated Cloud Run containers.
            </p>
          </div>

          <div className="bg-[#12141B] border border-[#262A35] rounded-sm p-5">
            <h4 className="font-mono text-xs font-bold text-[#EDEEF2] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#F5B942]" />
              Are physical exports supported for corporate compliance audits?
            </h4>
            <p className="text-[#8B92A5] text-[11px] mt-2.5 leading-relaxed">
              Yes, our platform supports high-fidelity exports including tabular raw values as CSV/JSON, dynamic vector summaries as SVG/PNG, and full executive dossiers as PDF documents.
            </p>
          </div>
        </div>
      </section>

      {/* Contact & Book Demo Section */}
      <section id="contact" className="max-w-xl mx-auto px-8 py-20 border-t border-[#262A35]">
        <div className="text-center mb-12">
          <span className="text-[#F5B942] font-mono text-[10px] tracking-widest font-bold uppercase">05 / ESTABLISH ADVISORY CONNECTION</span>
          <h2 className="text-2xl font-display font-black text-[#EDEEF2] uppercase mt-2">Request Corporate Access</h2>
          <p className="text-[#8B92A5] text-xs mt-2">Submit your details to establish a persistent sandbox tenant.</p>
        </div>

        {contactSuccess ? (
          <div className="bg-[#12141B] border border-[#2DD9A8]/30 rounded-sm p-8 text-center font-mono text-xs shadow-2xl relative overflow-hidden bracket-card animate-in fade-in zoom-in-95 duration-200">
            {/* Corner bracket styling */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#2DD9A8]" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#2DD9A8]" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#2DD9A8]" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#2DD9A8]" />

            <div className="w-12 h-12 bg-[#2DD9A8]/10 text-[#2DD9A8] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#2DD9A8]/20">
              <CheckCircle className="w-6 h-6" />
            </div>

            <h3 className="text-[#EDEEF2] font-display font-black text-sm uppercase tracking-tight mb-2">
              ✔ Request Submitted Successfully
            </h3>

            <div className="bg-[#0A0B0F] border border-[#262A35] p-3.5 rounded-sm mb-5 text-center">
              <span className="block text-[#545B6E] text-[9px] uppercase tracking-wider mb-1 font-bold">Reference ID:</span>
              <span className="font-mono text-xs font-bold text-[#F5B942] tracking-wider selection:bg-[#F5B942]/20">{contactReferenceId}</span>
            </div>

            <p className="text-[#8B92A5] text-[11px] mb-5 leading-relaxed">
              Your request has been delivered successfully.
            </p>

            <p className="text-[#2DD9A8] text-[11px] font-semibold">
              Our enterprise team will contact you within 24 hours.
            </p>

            <button
              onClick={() => {
                setContactSuccess(false);
                setContactReferenceId("");
              }}
              className="mt-6 text-[10px] text-[#F5B942] uppercase hover:underline font-bold"
            >
              [ SUBMIT ANOTHER REQUEST ]
            </button>
          </div>
        ) : (
          <form onSubmit={handleContactSubmit} className="space-y-4 font-mono text-xs">
            {contactError && (
              <div className="bg-[#F4485C]/10 border border-[#F4485C]/20 text-[#F4485C] rounded-sm p-3.5 text-center font-mono text-[11px] leading-relaxed">
                <span className="font-bold">TRANSMISSION ERROR:</span> {contactError}
              </div>
            )}

            <div>
              <label className="block text-[#8B92A5] text-[9px] uppercase tracking-wider mb-1.5 font-bold">Your Name</label>
              <input
                type="text"
                required
                disabled={contactSubmitting}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Dr. Evelyn Thorne"
                className="w-full bg-[#0A0B0F] border border-[#262A35] rounded-sm py-2 px-3 text-xs text-[#EDEEF2] placeholder-[#545B6E] focus:outline-none focus:border-[#F5B942] transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[#8B92A5] text-[9px] uppercase tracking-wider mb-1.5 font-bold">Corporate Email</label>
              <input
                type="email"
                required
                disabled={contactSubmitting}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.thorne@nexusai.com"
                className="w-full bg-[#0A0B0F] border border-[#262A35] rounded-sm py-2 px-3 text-xs text-[#EDEEF2] placeholder-[#545B6E] focus:outline-none focus:border-[#F5B942] transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[#8B92A5] text-[9px] uppercase tracking-wider mb-1.5 font-bold">Company / Organization</label>
              <input
                type="text"
                required
                disabled={contactSubmitting}
                value={contactCompany}
                onChange={(e) => setContactCompany(e.target.value)}
                placeholder="Nexus Artificial Intelligence"
                className="w-full bg-[#0A0B0F] border border-[#262A35] rounded-sm py-2 px-3 text-xs text-[#EDEEF2] placeholder-[#545B6E] focus:outline-none focus:border-[#F5B942] transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[#8B92A5] text-[9px] uppercase tracking-wider mb-1.5 font-bold">Inquiry Details</label>
              <textarea
                required
                rows={4}
                disabled={contactSubmitting}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Describe your forecasting scale or database streaming parameters..."
                className="w-full bg-[#0A0B0F] border border-[#262A35] rounded-sm py-2 px-3 text-xs text-[#EDEEF2] placeholder-[#545B6E] focus:outline-none focus:border-[#F5B942] transition resize-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={contactSubmitting}
              className="w-full bg-[#F5B942] hover:bg-[#F5B942]/90 disabled:bg-[#F5B942]/40 disabled:text-[#0A0B0F]/60 text-[#0A0B0F] font-bold py-2.5 rounded-sm transition flex items-center justify-center gap-2"
            >
              {contactSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[#0A0B0F]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  TRANSMITTING REQUEST...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  TRANSMIT DEMO REQUEST
                </>
              )}
            </button>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[#262A35] px-8 py-12 text-center text-[#545B6E] text-[10px] font-mono">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-left mb-12">
          <div>
            <div className="flex items-center gap-2 text-[#EDEEF2] mb-3">
              <div className="w-5 h-5 bg-[#F5B942] rounded-sm rotate-45 flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 bg-[#0A0B0F] rounded-sm -rotate-45 font-black text-[6px] text-[#F5B942] flex items-center justify-center">IF</div>
              </div>
              <span className="font-display font-black tracking-tight text-xs uppercase">InsightForge</span>
            </div>
            <p className="text-[10px] leading-relaxed">Dedicated PostgreSQL workspace and predictive AutoML model fitting pipeline.</p>
          </div>
          <div>
            <h5 className="font-bold text-[#EDEEF2] mb-3 uppercase">Platform</h5>
            <ul className="space-y-1.5">
              <li><a href="#features" className="hover:text-[#F5B942] transition">AutoML Studio</a></li>
              <li><a href="#features" className="hover:text-[#F5B942] transition">Forecaster Suite</a></li>
              <li><a href="#features" className="hover:text-[#F5B942] transition">Realtime Stream</a></li>
              <li><a href="#features" className="hover:text-[#F5B942] transition">AI Copilot Node</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#EDEEF2] mb-3 uppercase">Resources</h5>
            <ul className="space-y-1.5">
              <li><a href="#faq" className="hover:text-[#F5B942] transition">API Schema docs</a></li>
              <li><a href="#faq" className="hover:text-[#F5B942] transition">SHAP compliance</a></li>
              <li><a href="#faq" className="hover:text-[#F5B942] transition">SQL Partitioning</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#EDEEF2] mb-3 uppercase">Security</h5>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-1.5 text-[#2DD9A8]"><Shield className="w-3.5 h-3.5" /> ISO-27001 SECURE</li>
              <li className="flex items-center gap-1.5 text-[#2DD9A8]"><LockKeyhole className="w-3.5 h-3.5" /> FIREBASE AUTH SHIELD</li>
              <li className="flex items-center gap-1.5 text-[#2DD9A8]"><Database className="w-3.5 h-3.5" /> DRIZZLE SQL ISOLATION</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#262A35]/30 pt-6 flex flex-col md:flex-row items-center justify-between text-[#545B6E]">
          <p>© 2026 InsightForge™ Inc. Dedicated Cloud SQL Instance. All Rights Reserved.</p>
          <div className="flex gap-4 mt-2 md:mt-0">
            <a href="#faq" className="hover:text-[#F5B942] transition">TERMS OF SERVICE</a>
            <a href="#faq" className="hover:text-[#F5B942] transition">PRIVACY CHARTER</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
