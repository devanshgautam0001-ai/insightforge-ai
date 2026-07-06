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
  ArrowRight
} from "lucide-react";
import { useAuth } from "../lib/auth.tsx";

export default function LandingPage() {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    forgotPassword,
  } = useAuth();

  // Mode: "landing", "login", "register", "forgot"
  const [authMode, setAuthMode] = useState<"landing" | "login" | "register" | "forgot">("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
      return "Email/Password sign-in is currently disabled in your Firebase project.\n\nTo enable Email/Password Authentication:\n1. Open your Firebase Console.\n2. Navigate to Authentication > Sign-in method.\n3. Click 'Add new provider' and select 'Email/Password'.\n4. Toggle the 'Enable' switch and click 'Save'.\n5. Refresh this page and try again!";
    }
    if (code === "auth/email-already-in-use" || msg.includes("auth/email-already-in-use")) {
      return "An account with this email address already exists on InsightForge.\n\nIf you've already registered, please click 'Back to Sign In' below.";
    }
    if (code === "auth/weak-password" || msg.includes("auth/weak-password")) {
      return "The password is too weak. Firebase requires passwords to be at least 6 characters long.";
    }
    if (code === "auth/invalid-email" || msg.includes("auth/invalid-email")) {
      return "The email address format is invalid. Please check the spelling.";
    }
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      msg.includes("auth/invalid-credential") ||
      msg.includes("auth/wrong-password") ||
      msg.includes("auth/user-not-found")
    ) {
      return "Incorrect email or password. Please verify your credentials and try again.";
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
        
        // Strict Password Rules validation
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
        if (!/[^A-Za-z0-9]/.test(password)) {
          throw new Error("Password must contain at least one special character (e.g. !@#$%^&*).");
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

  if (authMode !== "landing") {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center relative p-6 overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-semibold mb-3 border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              InsightForge™ Predictive Platform
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {authMode === "login" && "Welcome Back"}
              {authMode === "register" && "Create an Account"}
              {authMode === "forgot" && "Reset Password"}
            </h2>
            <p className="text-zinc-400 text-xs mt-1.5">
              {authMode === "login" && "Access your secure cloud analytics workspace."}
              {authMode === "register" && "Start building robust machine learning pipelines today."}
              {authMode === "forgot" && "Provide your email to regain workspace control."}
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-4 text-xs mb-5 text-left whitespace-pre-line leading-relaxed font-sans">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3 text-xs mb-5 text-center">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="block text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {authMode !== "forgot" && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Password</label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => setAuthMode("forgot")}
                      className="text-[11px] text-blue-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                
                {authMode === "login" && (
                  <div className="flex items-center gap-2 mt-3 select-none">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 bg-zinc-950 border border-zinc-800 rounded focus:ring-0 focus:ring-offset-0 text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                      Remember Me
                    </label>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 mt-2"
            >
              {loading ? "Please wait..." : authMode === "login" ? "Sign In" : authMode === "register" ? "Create Account" : "Submit reset link"}
            </button>
          </form>

          {authMode !== "forgot" && (
            <>
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink mx-4 text-zinc-600 text-[11px] font-bold uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                Continue with Google
              </button>
            </>
          )}

          <div className="text-center mt-6 text-xs text-zinc-500">
            {authMode === "login" && (
              <>
                New to InsightForge?{" "}
                <button onClick={() => setAuthMode("register")} className="text-blue-400 hover:underline">
                  Sign up
                </button>
              </>
            )}
            {authMode === "register" && (
              <>
                Already have an account?{" "}
                <button onClick={() => setAuthMode("login")} className="text-blue-400 hover:underline">
                  Log in
                </button>
              </>
            )}
            {authMode === "forgot" && (
              <button onClick={() => setAuthMode("login")} className="text-blue-400 hover:underline">
                Back to login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-200 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[800px] left-[-200px] w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="border-b border-zinc-900 bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-600/20">
            IF
          </div>
          <span className="font-extrabold text-white tracking-tight">InsightForge™</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#features" className="text-xs text-zinc-400 hover:text-white transition">Features</a>
          <a href="#pricing" className="text-xs text-zinc-400 hover:text-white transition">Pricing</a>
          <a href="#faq" className="text-xs text-zinc-400 hover:text-white transition">FAQ</a>
          <button
            onClick={() => setAuthMode("login")}
            className="text-xs text-zinc-300 hover:text-white transition"
          >
            Log In
          </button>
          <button
            onClick={() => setAuthMode("register")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md shadow-blue-600/10 transition"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-8 pt-24 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-semibold mb-6 border border-blue-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          The Modern Cloud Predictive Engine
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
          SaaS Analytics Built For <br />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Continuous Ingest & AutoML
          </span>
        </h1>

        <p className="text-zinc-400 text-base max-w-2xl mx-auto mt-6 leading-relaxed">
          Clean high-variance tabular structures, trigger AutoML routines, and compile executive advisories instantly. Powered securely on dedicated Cloud SQL architecture.
        </p>

        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            onClick={() => setAuthMode("register")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-600/20 transition"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAuthMode("login")}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-extrabold px-6 py-3 rounded-lg transition"
          >
            Access Sandbox
          </button>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-8 py-20 border-t border-zinc-900">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white tracking-tight">Full-Stack SaaS Core Capabilities</h2>
          <p className="text-zinc-500 text-xs mt-2">Pragmatic, high-fidelity forecasting and anomalies stream modeling without fake data.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 hover:border-blue-500/30 transition">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center mb-5">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Dynamic AutoML Leaderboard</h3>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              Auto-calculates classification metrics, F1 scores, R², and feature importance maps instantly across custom columns.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 hover:border-blue-500/30 transition">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center mb-5">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Tabular Cleansing Pipeline</h3>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              Clean missing structures, impute categorical means, and enforce IQR outlier boundaries with detailed cleaning change logs.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 hover:border-blue-500/30 transition">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center mb-5">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Cloud SQL Isolation</h3>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              Your tables, projects, and custom models are isolated per user-account, backed securely by dedicated PostgreSQL architecture.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section id="pricing" className="max-w-5xl mx-auto px-8 py-20 border-t border-zinc-900">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white tracking-tight">Simple, Predictable Plans</h2>
          <p className="text-zinc-500 text-xs mt-2">Flexible plans for early researchers or complete analytical institutions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500">Starter</span>
              <h3 className="text-2xl font-extrabold text-white mt-1">$0 <span className="text-xs text-zinc-500 font-normal">/ month</span></h3>
              <p className="text-zinc-400 text-xs mt-2">Explore the workbench and profile minor datasets with zero cost.</p>
              <ul className="space-y-2 mt-6 text-xs text-zinc-400">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> 1 Sandbox Workspace</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> 10 Dataset Profiles</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> Standard Outliers Filtering</li>
              </ul>
            </div>
            <button
              onClick={() => setAuthMode("register")}
              className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-xs py-2.5 rounded-lg w-full transition mt-8"
            >
              Start For Free
            </button>
          </div>

          {/* Professional */}
          <div className="bg-blue-900/10 border-2 border-blue-500 rounded-2xl p-6 flex flex-col justify-between relative">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-blue-600 text-white text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-full">
              Most Popular
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-blue-400">Professional</span>
              <h3 className="text-2xl font-extrabold text-white mt-1">$49 <span className="text-xs text-zinc-500 font-normal">/ month</span></h3>
              <p className="text-zinc-400 text-xs mt-2">Comprehensive suite for corporate analysts requiring robust forecasts.</p>
              <ul className="space-y-2 mt-6 text-xs text-zinc-400">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500 shrink-0" /> Unlimited Projects</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500 shrink-0" /> Live AutoML Pipelines</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500 shrink-0" /> Continuous Time Series Forecasting</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500 shrink-0" /> Premium AI Executive Summary</li>
              </ul>
            </div>
            <button
              onClick={() => setAuthMode("register")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-lg w-full shadow-lg shadow-blue-600/15 transition mt-8"
            >
              Sign Up Now
            </button>
          </div>

          {/* Enterprise */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500">Enterprise</span>
              <h3 className="text-2xl font-extrabold text-white mt-1">$199 <span className="text-xs text-zinc-500 font-normal">/ month</span></h3>
              <p className="text-zinc-400 text-xs mt-2">For large-scale departments processing petabyte-level streams.</p>
              <ul className="space-y-2 mt-6 text-xs text-zinc-400">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> Dedicated SQL Replica Isolation</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> Full RBAC Member Controls</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> SSE Real-Time IoT Stream Access</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> SLA & Priority Chat Assistance</li>
              </ul>
            </div>
            <button
              onClick={() => setAuthMode("register")}
              className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-xs py-2.5 rounded-lg w-full transition mt-8"
            >
              Contact Advisory
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-8 py-20 border-t border-zinc-900">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white tracking-tight">Frequently Answered</h2>
          <p className="text-zinc-500 text-xs mt-2">Get answers to critical platform architecture specifications.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900/20 border border-zinc-850 rounded-xl p-5">
            <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              Is my enterprise dataset kept isolated?
            </h4>
            <p className="text-zinc-400 text-[11px] mt-2.5 leading-relaxed">
              Absolutely. In contrast to demo environments, our multi-user architecture isolates rows per project tenant inside PostgreSQL, utilizing Firebase auth headers.
            </p>
          </div>

          <div className="bg-zinc-900/20 border border-zinc-850 rounded-xl p-5">
            <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              How does the local AutoML training pipeline execute?
            </h4>
            <p className="text-zinc-400 text-[11px] mt-2.5 leading-relaxed">
              We run highly robust mathematical split algorithms on your uploaded numerical arrays and categorically map drivers directly inside the sandbox container environment.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 px-8 py-12 text-center text-zinc-600 text-[11px]">
        <p>© 2026 InsightForge™ Inc. Dedicated Cloud SQL Instance. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
