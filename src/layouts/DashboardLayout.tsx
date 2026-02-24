"use client";

import { NavBar } from "@/components/dashboard/global/NavBar";
import { SideBar } from "@/components/dashboard/global/SideBar";
import { useState } from "react";

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex">
      <SideBar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 relative">
        <NavBar onMenuToggle={() => setSidebarOpen(true)} />
        {children}
      </div>
    </div>
  );
};
