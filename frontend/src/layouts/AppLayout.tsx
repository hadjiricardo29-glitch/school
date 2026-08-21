import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { AppTopbar } from "@/components/layout/AppTopbar";

export function AppLayout() {
  return (
    <div className="flex min-h-dvh bg-surface-alt">
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 px-4 pb-20 pt-5 sm:px-6 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <AppSidebar />
      <AppBottomNav />
    </div>
  );
}
