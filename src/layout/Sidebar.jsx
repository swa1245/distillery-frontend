import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, FlaskConical, LogOut, Plus, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { NAV_ITEMS } from "../data/nav";

function pathOf(to) {
  return String(to || "").split("?")[0];
}

function queryOf(to) {
  const q = String(to || "").split("?")[1];
  return q ? new URLSearchParams(q) : null;
}

function isChildActive(location, to) {
  const pathname = pathOf(to);
  if (location.pathname !== pathname) return false;
  const want = queryOf(to);
  const have = new URLSearchParams(location.search);
  if (!want) {
    const type = have.get("type");
    return !type || !["Chemicals", "Enzyme", "Yeast"].includes(type);
  }
  return want.get("type") === have.get("type");
}

function NavItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      title={item.hint || item.name}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[13px] font-bold transition-all duration-300 ease-out ${
          isActive
            ? "bg-[#2563eb] text-white shadow-sm"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors ${
              isActive
                ? "bg-white/15 text-white"
                : "bg-[#0e1a2e] text-slate-300 border border-white/10 group-hover:border-sky-300/30 group-hover:text-sky-100"
            }`}
          >
            <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
          </span>
          <span className="truncate leading-snug">{item.name}</span>
        </>
      )}
    </NavLink>
  );
}

function NestedNav({ item }) {
  const Icon = item.icon;
  const location = useLocation();
  const navigate = useNavigate();
  const inSection = location.pathname.startsWith(item.path);
  const [open, setOpen] = useState(inSection);
  const [groupId, setGroupId] = useState(() => {
    if (
      location.pathname.includes("/product") ||
      location.pathname.includes("/outward-dispatch") ||
      location.pathname.includes("/visits")
    ) {
      return "outward";
    }
    return "inward";
  });

  useEffect(() => {
    if (inSection) setOpen(true);
  }, [inSection]);

  useEffect(() => {
    if (
      location.pathname.includes("/product") ||
      location.pathname.includes("/outward-dispatch") ||
      location.pathname.includes("/visits")
    ) {
      setGroupId("outward");
    } else if (inSection) {
      setGroupId("inward");
    }
  }, [location.pathname, inSection]);

  const firstChildPath =
    item.children?.[0]?.path || item.groups?.[0]?.items?.[0]?.path || item.path;

  const toggle = () => {
    if (open && inSection) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!inSection) navigate(firstChildPath);
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        title={item.hint || item.name}
        className={`group flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-[13px] font-bold transition-all duration-300 ease-out ${
          inSection
            ? "text-white"
            : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-[10px] shrink-0 transition-all duration-300 ${
            inSection
              ? "bg-[#2563eb]/20 text-white"
              : "bg-white/[0.06] text-slate-300 border border-white/10 group-hover:border-sky-300/30"
          }`}
        >
          <Icon size={16} strokeWidth={inSection || open ? 2.4 : 2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-left leading-snug">{item.name}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-white/70 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {item.children?.length ? (
            <div className="mt-1.5 ml-[22px] space-y-0.5 border-l border-white/15 px-0.5 pb-1 pl-3">
              {item.children.map((child) => {
                const active = isChildActive(location, child.path);
                return (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    end={Boolean(child.end)}
                    className={`block rounded-[10px] px-3 py-1.5 text-[13px] font-medium tracking-tight transition-all duration-200 ${
                      active
                        ? "bg-[#2563eb] text-white shadow-sm"
                        : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    {child.label}
                  </NavLink>
                );
              })}
            </div>
          ) : (
          <div className="mt-1.5 space-y-1.5 px-0.5 pb-1">
            {(item.groups || []).map((group) => {
              const expanded = groupId === group.id;
              return (
                <div key={group.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setGroupId(expanded ? "" : group.id)}
                    className={`flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-[13px] font-bold tracking-tight transition-all duration-300 ease-out ${
                      expanded
                        ? "bg-[#3b74e8] text-white shadow-[0_8px_16px_rgba(59,116,232,0.32)]"
                        : "bg-white/[0.06] text-white/85 hover:bg-white/[0.11]"
                    }`}
                  >
                    <Plus size={15} strokeWidth={2.6} className={expanded ? "text-sky-100" : "text-white/55"} />
                    {group.label}
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-1 space-y-0.5 pl-4 pr-0.5">
                        {group.items.map((child) => {
                          const active = isChildActive(location, child.path);
                          return (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              className={`block rounded-[10px] px-3 py-1.5 text-[13px] font-medium tracking-tight transition-all duration-200 ${
                                active
                                  ? "bg-[#2563eb] text-white shadow-sm"
                                  : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                              }`}
                            >
                              {child.label}
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-[280px] bg-[#07111f] text-slate-50 h-screen flex flex-col border-r border-[#0f2744] relative z-30 shrink-0 font-jakarta">
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-2xl bg-[#0e1a2e] border border-[#1a2d4a]">
          <div className="p-2 bg-[#2563eb] text-white rounded-xl shadow-sm shrink-0">
            <FlaskConical size={16} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-extrabold tracking-tight text-slate-50 truncate">
              {user?.organizationName || "Digital Distillery"}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              Operations
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 custom-scrollbar-soft">
        <p className="px-3 pt-1 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
          Main
        </p>
        {NAV_ITEMS.map((item) =>
          item.groups?.length || item.children?.length ? (
            <NestedNav key={item.path} item={item} />
          ) : (
            <NavItem key={item.path} item={item} />
          )
        )}
      </nav>

      <div className="shrink-0 px-3 pb-3">
        <div className="rounded-xl bg-[#0e1a2e] border border-[#1a2d4a] p-2.5 mb-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Plant</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <p className="text-[12px] font-bold text-white">Operations live</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#0e1a2e] border border-[#1a2d4a] p-2.5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center font-extrabold text-xs">
                {user?.username ? user.username.charAt(0).toUpperCase() : <User size={14} />}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0e1a2e]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-slate-50 truncate leading-tight">
                {user?.username || "Plant User"}
              </p>
              <span className="inline-flex mt-1 text-[9px] font-extrabold tracking-wide px-1.5 py-0.5 rounded border bg-[#2563eb]/30 text-sky-200 border-[#2563eb]/50">
                {user?.role || "User"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200 hover:bg-rose-700 hover:border-rose-700 hover:text-white transition-all duration-200"
          >
            <LogOut size={13} strokeWidth={2.4} />
            <span className="text-xs font-bold">Sign Out</span>
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-[10px] font-semibold text-slate-500">v1.0.0</p>
      </div>
    </aside>
  );
}
