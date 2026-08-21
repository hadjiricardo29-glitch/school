import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

export function AdminLayout() {
  return (
    <div className="flex min-h-dvh bg-surface-alt">
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
      <AdminSidebar />
    </div>
  );
}
