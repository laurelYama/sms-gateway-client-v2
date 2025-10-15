import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import ProtectedRoute from '@/components/auth/protected-route';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar fixe */}
        <div className="fixed left-0 top-0 h-full z-10">
          <Sidebar />
        </div>
        
        {/* Contenu principal avec marge pour la sidebar */}
        <div className="flex-1 flex flex-col ml-64">
          {/* Topbar fixe */}
          <div className="fixed top-0 right-0 left-64 z-10">
            <Topbar />
          </div>
          
          {/* Contenu défilant */}
          <main className="flex-1 bg-gray-100 p-6 mt-16 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
