import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Liste des chemins publics accessibles sans authentification
const publicPaths = ['/login', '/forgot-password', '/_next', '/favicon.ico'];

// Fonction pour vérifier si le chemin est public
const isPublicPath = (pathname: string) => {
  return publicPaths.some(path => 
    pathname === path || 
    pathname.startsWith(`${path}/`) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/')
  );
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Ne pas appliquer le middleware pour les fichiers statiques et les API
  if (
    pathname.startsWith('/_next') || 
    pathname.includes('.') || 
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('authToken')?.value;
  const userCookie = request.cookies.get('user')?.value;
  
  console.log(`[MIDDLEWARE] Chemin: ${pathname}, Token: ${token ? 'présent' : 'absent'}`);

  // Si c'est une route publique, laisser passer
  if (isPublicPath(pathname)) {
    // Ne plus rediriger automatiquement vers /dashboard si déjà connecté
    // La page de login gérera elle-même la redirection si nécessaire
    return NextResponse.next();
  }

  // Si pas de token, rediriger vers la page de connexion
  if (!token) {
    console.log('[MIDDLEWARE] Pas de token, redirection vers /login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Vérifier le rôle de l'utilisateur
  if (userCookie) {
    try {
      const userData = JSON.parse(userCookie);
      // Vérifier si l'utilisateur a un rôle valide
      if (!userData.role) {
        console.log('[MIDDLEWARE] Rôle non défini pour l\'utilisateur');
        // Au lieu de rediriger, on laisse passer pour l'instant
        // et on laisse la page gérer l'authentification
        return NextResponse.next();
      }
    } catch (error) {
      console.error('[MIDDLEWARE] Erreur lors de la vérification du rôle:', error);
      // En cas d'erreur, on nettoie les cookies mais on ne redirige pas
      // pour éviter les boucles de redirection
      const response = NextResponse.next();
      response.cookies.delete('authToken');
      response.cookies.delete('user');
      return response;
    }
  }

  // Laisser passer la requête pour les utilisateurs authentifiés
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
