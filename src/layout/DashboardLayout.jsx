import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-stone-250 font-jakarta">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-stone-250">
        <Outlet />
      </main>
    </div>
  );
}
