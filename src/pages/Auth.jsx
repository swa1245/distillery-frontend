import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, AlertCircle, Eye, EyeOff, Loader2, FlaskConical } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import loginHero from "../assets/login-hero.png";

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      if (!email.trim() || password.length < 4) {
        throw new Error("Enter a valid email and password (min 4 characters).");
      }
      const username = email.split("@")[0] || "Operator";
      login({
        email: email.trim(),
        username: username.replace(/[._]/g, " "),
        role: "admin",
        organizationName: "Digital Distillery",
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-jakarta min-h-screen flex bg-white">
      <aside className="hidden lg:flex lg:w-[52%] relative overflow-hidden min-h-screen">
        <img
          src={loginHero}
          alt="Ethanol distillery columns and process plant"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-14 text-white">
          <div className="inline-flex w-fit items-center gap-3 rounded-2xl bg-[#07111f]/40 px-3.5 py-2.5 backdrop-blur-[2px]">
            <div className="w-11 h-11 rounded-xl bg-[#2563eb] flex items-center justify-center ring-2 ring-white/30 shadow-md">
              <FlaskConical size={22} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight leading-none">Digital Distillery</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200 mt-1">
                Operations
              </p>
            </div>
          </div>

          <div className="max-w-lg rounded-2xl bg-[#07111f]/40 px-5 py-5 backdrop-blur-[2px]">
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.12]">
              Digital distillery
              <span className="block text-sky-200 mt-1">operation, under control.</span>
            </h1>
            <p className="mt-4 text-sm font-semibold text-white/85 leading-relaxed max-w-md">
              Grain, mash, fermentation, production, QC, and documentation — one workspace for ethanol plant teams.
            </p>
          </div>
        </div>
      </aside>

      <main className="relative flex-1 flex items-center justify-center px-6 py-8 sm:px-12 overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-[#eef3f9] via-white to-[#dce8f5]" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#2563eb]/[0.08] rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />

        <div className="relative z-10 w-full max-w-[560px]">
          <div className="mb-9 -mt-8">
            <div className="flex items-center gap-3.5 mb-7">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-2xl bg-[#2563eb]/10" />
                <div className="relative w-12 h-12 rounded-xl bg-[#2563eb] text-white flex items-center justify-center border border-[#163056]/40 shadow-[0_4px_14px_rgba(37,99,235,0.25)]">
                  <FlaskConical size={22} strokeWidth={2.2} />
                </div>
              </div>
              <div>
                <p className="text-lg font-black text-[#0f2744] tracking-tight leading-none">
                  Digital Distillery
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 mt-1.5">
                  Operations
                </p>
              </div>
            </div>

            <h2 className="text-[38px] sm:text-[42px] font-black text-stone-900 tracking-tight leading-[1.05]">
              Welcome back
            </h2>
            <p className="text-[15px] font-medium text-stone-500 mt-2.5">
              Sign in to continue to your distillery workspace
            </p>
            <div className="mt-5 h-[3px] w-14 rounded-full bg-[#2563eb]" />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 px-3.5 py-3 rounded-xl text-xs font-bold mb-5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-stone-500 mb-1.5 block">Email</label>
              <div className="relative group">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#2563eb] transition-colors"
                />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-transparent border border-stone-200 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 text-stone-800 font-semibold rounded-xl outline-none transition-all text-sm placeholder:text-stone-400"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-500 mb-1.5 block">Password</label>
              <div className="relative group">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#2563eb] transition-colors"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-transparent border border-stone-200 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 text-stone-800 font-semibold rounded-xl outline-none transition-all text-sm placeholder:text-stone-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-[#2563eb]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 bg-[#2563eb] hover:bg-[#163056] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_10px_24px_rgba(37,99,235,0.32)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] font-semibold text-stone-400 leading-relaxed">
            By signing in you agree to our{" "}
            <Link to="/privacy" className="font-bold text-[#2563eb] hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="font-bold text-[#2563eb] hover:underline">
              Terms of Use
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
