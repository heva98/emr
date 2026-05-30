import { useState } from "react";
import { Outlet } from "react-router-dom";
import TopHeader from "./TopHeader";
import Sidebar from "./Sidebar";
import Breadcrumb from "./Breadcrumb";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-page-bg">
      <TopHeader />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className="transition-all duration-300 pt-14"
        style={{ marginLeft: collapsed ? "4rem" : "15rem" }}
      >
        <div className="p-6">
          <Breadcrumb />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
