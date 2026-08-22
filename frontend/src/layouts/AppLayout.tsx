import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { AppMobileDrawer } from "@/components/layout/AppMobileDrawer";
import { AppTopbar } from "@/components/layout/AppTopbar";

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-white">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 pb-20 pt-5 sm:px-6 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <AppMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <AppBottomNav />
    </div>
  );
}
