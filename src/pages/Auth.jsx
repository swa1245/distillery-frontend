import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  BarChart3,
  FlaskConical,
  Leaf,
  Headphones,
  Settings,
  Building2,
} from "lucide-react";
import loginHero from "../assets/login-hero.png";
import brandLogo from "../assets/biofuelpro-logo.png";
import { useAuth } from "../context/AuthContext";

function BrandLogo({ className = "w-11 h-11" }) {
  return (
    <img
      src={brandLogo}
      alt="BioFuelPro"
      className={`${className} object-contain`}
    />
  );
}

const FEATURES = [
  {
    icon: BarChart3,
    title: "Real-time Monitoring",
    desc: "Live data from fermentation to distillation",
  },
  {
    icon: FlaskConical,
    title: "Process Optimization",
    desc: "Improve yield, quality and plant efficiency",
  },
  {
    icon: ShieldCheck,
    title: "Data Integrity",
    desc: "Secure, accurate and audit ready data",
  },
  {
    icon: Leaf,
    title: "Sustainable Growth",
    desc: "Driving biofuel excellence for a better planet",
  },
];

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = String(form.email || "").trim();
    if (!email || !form.password) return;

    const username = email.includes("@") ? email.split("@")[0] : email;
    login({
      username: username || "Operator",
      email,
      role: "admin",
      organizationName: "BioFuelPro Distillery",
    });
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="font-jakarta min-h-screen flex bg-white text-[#1f2937]">
      {/* Left — login */}
      <section className="w-full lg:w-[36%] xl:w-[34%] flex flex-col px-8 sm:px-11 xl:px-12 py-7 min-h-screen bg-white border-r border-stone-100">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="w-10 h-10 shrink-0" />
          <div>
            <p className="text-[1.4rem] font-extrabold leading-none tracking-tight text-[#166534]">
              BioFuelPro
            </p>
            <p className="text-[11px] text-stone-500 mt-1 font-medium">
              Distillery Management System
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto lg:mx-0 py-8">
          <h1 className="text-[1.9rem] font-extrabold text-[#111827] tracking-tight">
            Welcome Back!
          </h1>
          <p className="text-stone-500 mt-2 text-[14px] leading-relaxed">
            Login to access your distillery operations and insights
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#111827] mb-1.5">
                User ID / Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-stone-400" />
                <input
                  type="text"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter your user ID or email"
                  className="w-full pl-11 pr-4 py-[13px] rounded-lg border border-stone-300 bg-white text-[14px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#111827] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-stone-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-11 py-[13px] rounded-lg border border-stone-300 bg-white text-[14px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-stone-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-green-700 focus:ring-green-700"
                />
                Remember me
              </label>
              <button type="button" className="font-semibold text-[#15803d] hover:text-green-800">
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-[13px] rounded-lg bg-[#166534] hover:bg-[#14532d] text-white font-semibold text-[15px] shadow-md shadow-green-900/15 transition mt-1"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          </form>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-stone-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#16a34a]" />
          <span>
            Secure Login <span className="text-stone-300 mx-1">|</span> Your data is protected
          </span>
        </div>
      </section>

      {/* Right — hero */}
      <section className="hidden lg:flex flex-1 relative overflow-hidden min-h-screen">
        <img
          src={loginHero}
          alt="Biofuel distillery plant"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/70" />

        <div className="relative z-10 flex flex-col h-full w-full">
          {/* Top row: headline + badge */}
          <div className="flex items-start justify-between gap-6 px-10 xl:px-12 pt-9">
            <div className="max-w-lg pt-1">
              <h2 className="text-[2.35rem] xl:text-[2.75rem] font-extrabold text-white leading-[1.12] tracking-tight drop-shadow">
                Powering Sustainable
                <br />
                <span className="text-[#4ade80]">Biofuel Future</span>
              </h2>
              <div className="w-14 h-[3px] bg-[#4ade80] rounded-full mt-4 mb-4" />
              <p className="text-white/90 text-[15px] xl:text-base leading-relaxed max-w-md">
                Smart monitoring. Better decisions. Higher efficiency.
                <br />
                Together for a greener tomorrow.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-[11px] font-semibold text-white shrink-0 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" />
              Enterprise Grade Security
            </span>
          </div>

          <div className="flex-1" />

          {/* Feature strip */}
          <div className="mx-6 xl:mx-8 mb-0 rounded-t-xl bg-[#052e1a]/75 backdrop-blur-md border border-white/10 border-b-0 px-5 xl:px-7 py-5">
            <div className="grid grid-cols-4 gap-4 xl:gap-6">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#16a34a]/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-[#4ade80]" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] xl:text-[13px] font-bold text-[#4ade80] leading-snug">
                      {title}
                    </p>
                    <p className="text-[10px] xl:text-[11px] text-white/80 leading-snug mt-1">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom footer bar */}
          <div className="bg-[#0b1220] px-6 xl:px-8 py-3.5">
            <div className="flex items-center justify-between gap-4 text-[11px] text-white/70">
              <div className="flex items-center gap-2 min-w-0">
                <Headphones className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                <span>
                  <span className="font-semibold text-white">Need Help?</span> Contact Support
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Settings className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>
                  Version 1.0.0 <span className="text-white/40 mx-1">|</span> All rights reserved
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0 justify-end text-right">
                <Building2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                <span>
                  <span className="font-semibold text-white">BioFuelPro Solutions Pvt. Ltd.</span>
                  {" "}Empowering Distilleries
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
