import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LegalDoc({ title, updated, children }) {
  const { user } = useAuth();
  const backLabel = user ? "Back to app" : "Back to sign in";

  return (
    <div className="font-jakarta min-h-screen bg-[#eef3f9] text-stone-800">
      <header className="border-b border-sky-200/80 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center">
              <FlaskConical size={18} />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-[#0f2744] leading-none">
                Digital Distillery
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                Legal
              </p>
            </div>
          </Link>
          <Link to="/" className="text-xs font-bold text-[#2563eb] hover:underline">
            {backLabel}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2563eb]">
          Digital Distillery
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-stone-900">{title}</h1>
        <p className="mt-2 text-xs font-semibold text-stone-500">Last updated: {updated}</p>
        <div className="mt-8 space-y-5 text-sm font-medium leading-relaxed text-stone-600 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-black [&_h2]:text-stone-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:font-bold [&_a]:text-[#2563eb] [&_a]:underline">
          {children}
        </div>
      </main>
    </div>
  );
}
