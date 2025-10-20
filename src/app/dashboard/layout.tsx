'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { BottomNav } from '@/components/dashboard/bottom-nav';
import ProtectedRoute from '@/components/auth/protected-route';
import { useMediaQuery } from '@/hooks/use-media-query';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar - visible uniquement sur desktop */}
        {!isMobile && (
          <div className="w-64 bg-white border-r border-gray-200">
            <Sidebar />
          </div>
        )}

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar - visible uniquement sur desktop */}
          {!isMobile && <Topbar />}
          
          {/* Contenu */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-20 md:pb-6 md:p-6">
            {children}
          </main>
          
          {/* Bottom Navigation - visible uniquement sur mobile */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200">
              <BottomNav />
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
