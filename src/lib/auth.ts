import Cookies from 'js-cookie';

interface UserPayload {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  typeCompte: string;
  statutCompte: string;
  iat?: number;
  exp?: number;
}

export function getUserFromCookies(): UserPayload | null {
  try {
    console.log('[AUTH] Récupération des informations utilisateur depuis les cookies...');
    
    // Vérifier d'abord dans les cookies gérés par js-cookie
    const userCookie = Cookies.get('user');
    console.log('[AUTH] Contenu brut du cookie user:', userCookie);
    
    if (!userCookie) {
      console.warn('[AUTH] Aucun cookie user trouvé dans les cookies gérés par js-cookie');
      
      // Essayer de récupérer directement depuis document.cookie
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/user=([^;]+)/);
        if (match && match[1]) {
          console.log('[AUTH] Cookie user trouvé dans document.cookie');
          const decodedCookie = decodeURIComponent(match[1]);
          try {
            const userData = JSON.parse(decodedCookie);
            console.log('[AUTH] Données utilisateur récupérées depuis document.cookie');
            return userData;
          } catch (parseError) {
            console.error('[AUTH] Erreur lors du parsing du cookie user depuis document.cookie:', parseError);
          }
        }
      }
      
      return null;
    }
    
    // Le cookie est déjà décodé par js-cookie
    const userData = JSON.parse(userCookie);
    
    // Vérifier que les champs obligatoires sont présents
    const requiredFields = ['id', 'email', 'role', 'typeCompte'];
    const missingFields = requiredFields.filter(field => !userData[field]);
    
    if (missingFields.length > 0) {
      console.error(`[AUTH] Données utilisateur incomplètes. Champs manquants: ${missingFields.join(', ')}`);
      return null;
    }
    
    console.log('[AUTH] Données utilisateur récupérées avec succès:', { 
      id: userData.id, 
      email: userData.email,
      typeCompte: userData.typeCompte,
      role: userData.role
    });
    
    return userData as UserPayload;
  } catch (error) {
    console.error('[AUTH] Erreur critique lors de la récupération des données utilisateur:', error);
    return null;
  }
}

export function getTokenFromCookies(): string | undefined {
  try {
    if (typeof document === 'undefined') {
      console.log('[AUTH] getTokenFromCookies appelé côté serveur');
      return undefined;
    }

    // Essayer de récupérer le token depuis les cookies accessibles côté client
    const clientToken = Cookies.get('authToken');
    
    // Si on trouve un token côté client, on le retourne
    if (clientToken) {
      console.log('[AUTH] Token trouvé dans les cookies côté client');
      return clientToken;
    }
    
    // Vérifier dans document.cookie (pour les cas où le cookie est HTTP-Only)
    console.log('[AUTH] Recherche du token dans document.cookie');
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'authToken' && value) {
        console.log('[AUTH] Token trouvé dans document.cookie');
        return decodeURIComponent(value);
      }
    }
    
    console.warn('[AUTH] Aucun token trouvé dans les cookies');
    console.log('[AUTH] Cookies actuels:', document.cookie);
    return undefined;
  } catch (error) {
    console.error('[AUTH] Erreur lors de la récupération du token:', error);
    return undefined;
  }
}

export function decodeJwtPayload(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      console.error('[AUTH] Format de token JWT invalide');
      return null;
    }
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[AUTH] Erreur lors du décodage du token JWT:', error);
    return null;
  }
}
