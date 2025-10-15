interface UserPayload {
  sub: string;
  id: string;
  nom: string;
  role: string;
  typeCompte: string;
  statutCompte: string;
  iat: number;
  exp: number;
}

export function decodeToken(token: string): UserPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('authToken='))
    ?.split('=')[1];
    
  return cookieValue ? decodeURIComponent(cookieValue) : null;
}

export function getUserFromToken(): UserPayload | null {
  if (typeof document === 'undefined') return null;
  
  try {
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user='))
      ?.split('=')[1];
      
    if (!userCookie) return null;
    
    // Décoder l'URL et parser le JSON
    const decodedUser = decodeURIComponent(userCookie);
    return JSON.parse(decodedUser);
  } catch (error) {
    console.error('Erreur lors de la récupération des données utilisateur:', error);
    return null;
  }
}
