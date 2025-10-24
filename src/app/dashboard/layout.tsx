'use client';

import { ReactNode, Suspense } from 'react';
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ProtectedRoute>
        <div className="flex flex-col h-screen bg-gray-50">
          <div className="flex flex-1 overflow-hidden relative">
            {/* Topbar - toujours visible, positionné à droite de la sidebar sur desktop */}
            <div className="fixed top-0 right-0 left-0 md:left-64 z-10">
              <Topbar />
            </div>
            {/* Sidebar - visible uniquement sur desktop */}
            {!isMobile && <Sidebar />}

            {/* Contenu principal */}
            <div className="flex-1 flex flex-col overflow-hidden md:ml-64 pt-24 md:pt-20">
              {/* Contenu */}
              <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-6 md:px-6">
                <div className="max-w-7xl mx-auto w-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
          
          {/* Bottom Navigation - visible uniquement sur mobile */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200">
              <BottomNav />
            </div>
          )}
        </div>
      </ProtectedRoute>
    </Suspense>
  );
}
