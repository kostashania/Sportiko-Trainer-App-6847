import React from 'react';
import { Outlet } from 'react-router-dom';
import SuperadminSidebar from './SuperadminSidebar';
import Header from './Header';

const SuperadminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <SuperadminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperadminLayout;