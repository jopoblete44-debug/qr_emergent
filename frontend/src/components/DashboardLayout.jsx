import React from 'react';
import { Navbar } from './Navbar';
import { DashboardSidebar, DashboardSidebarMobile } from './DashboardSidebar';

export const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <DashboardSidebarMobile />
        <div className="flex h-full">
          <DashboardSidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </div>
  );
};
