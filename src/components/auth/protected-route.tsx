'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = getTokenFromCookies();
        const user = getUserFromCookies();
        
        console.log('[AUTH] Vérification de l\'authentification...');
        console.log('[AUTH] Token présent:', !!token);
        console.log('[AUTH] Utilisateur présent:', !!user);
        
        if (!token || !user) {
          console.warn('[AUTH] Non authentifié, redirection vers /login');
          // Ne pas rediriger si on est déjà sur la page de login
          if (pathname !== '/login') {
            const redirectUrl = new URL('/login', window.location.origin);
            redirectUrl.searchParams.set('redirect', pathname);
            window.location.href = redirectUrl.toString();
          }
          setIsAuth(false);
        } else {
          console.log('[AUTH] Utilisateur authentifié:', { 
            id: user.id, 
            email: user.email,
            role: user.role 
          });
          setIsAuth(true);
        }
      } catch (error) {
        console.error('[AUTH] Erreur lors de la vérification de l\'authentification:', error);
        setIsAuth(false);
        if (pathname !== '/login') {
          const redirectUrl = new URL('/login', window.location.origin);
          redirectUrl.searchParams.set('error', 'auth_error');
          redirectUrl.searchParams.set('redirect', pathname);
          window.location.href = redirectUrl.toString();
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, searchParams]);

  // Afficher un indicateur de chargement pendant la vérification
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si l'utilisateur est authentifié, afficher le contenu protégé
  if (isAuth) {
    return <>{children}</>;
  }

  // Sinon, ne rien afficher (la redirection est gérée dans le useEffect)
  return null;
}
