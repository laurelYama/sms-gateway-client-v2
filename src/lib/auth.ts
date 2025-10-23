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
    // Vérifier d'abord dans les cookies gérés par js-cookie
    const userCookie = Cookies.get('user');
    
    if (!userCookie) {
      // Essayer de récupérer directement depuis document.cookie
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/user=([^;]+)/);
        if (match && match[1]) {
          const decodedCookie = decodeURIComponent(match[1]);
          try {
            return JSON.parse(decodedCookie);
          } catch (parseError) {
            return null;
          }
        }
      }
      return null;
    }

    try {
      const userData = JSON.parse(userCookie);
      
      // Vérifier que les champs requis sont présents
      const requiredFields = ['id', 'email', 'nom', 'typeCompte', 'statutCompte'];
      const isValid = requiredFields.every(field => userData[field]);
      
      return isValid ? (userData as UserPayload) : null;
    } catch (error) {
      return null;
    }
  } catch (error) {
    return null;
  }
}

export function getTokenFromCookies(): string | undefined {
  try {
    if (typeof document === 'undefined') {
      console.log('[getTokenFromCookies] Exécution côté serveur, impossible de récupérer le token');
      return undefined;
    }

    // Essayer de récupérer le token via js-cookie d'abord
    const clientToken = Cookies.get('authToken');
    console.log('[getTokenFromCookies] Token récupéré via js-cookie:', clientToken ? 'présent' : 'absent');
    
    if (clientToken) {
      console.log('[getTokenFromCookies] Token trouvé via js-cookie');
      return clientToken;
    }
    
    // Vérifier dans document.cookie (pour les cas où le cookie est HTTP-Only)
    console.log('[getTokenFromCookies] Vérification de document.cookie');
    const cookies = document.cookie.split(';');
    console.log('[getTokenFromCookies] Cookies trouvés:', cookies);
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name.trim() === 'authToken' && value) {
        console.log('[getTokenFromCookies] Token trouvé dans document.cookie');
        // Ne pas décoder l'URL car le token n'est pas encodé
        return value;
      }
    }
    
    return undefined;
  } catch (error) {
    return undefined;
  }
}

export function decodeJwtToken(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}
