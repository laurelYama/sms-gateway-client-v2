import { getTokenFromCookies, getUserFromCookies, decodeJwtToken } from '@/lib/auth';

/**
 * Récupère l'ID du client de manière sécurisée depuis différentes sources
 * @returns L'ID du client ou undefined si non trouvé
 */
export const getClientId = (): string | undefined => {
  try {
    // 1) Essayer depuis le token JWT
    const token = getTokenFromCookies();
    if (token) {
      try {
        const payload = decodeJwtToken(token);
        
        if (!payload) {
          console.warn('Impossible de décoder le token JWT');
        } else {
          // Préférer l'ID numérique à l'email
          if (payload?.id) {
            return String(payload.id);
          }
          
          // Fallback sur d'autres champs possibles
          const fromToken = [
            payload?.idclients,
            payload?.clientId,
            payload?.client_id,
            payload?.client,
            payload?.cid,
            payload?.idclient,
            payload?.typeCompte,
            payload?.sub
          ].find(Boolean);
          
          if (fromToken) {
            console.log('ClientId trouvé dans le token JWT (fallback):', fromToken);
            return String(fromToken);
          }
        }
      } catch (e) {
        console.error('Erreur lors du décodage du token:', e);
      }
    }

    // 2) Essayer depuis les cookies utilisateur
    const cookieUser = getUserFromCookies();
    
    // Vérifier si l'utilisateur a un clientId, un id ou un typeCompte
    if (cookieUser) {
      // Priorité 1: clientId
      if (cookieUser.clientId) {
        return String(cookieUser.clientId);
      }
      
      // Priorité 2: typeCompte (utilisé comme identifiant client)
      if (cookieUser.typeCompte) {
        return String(cookieUser.typeCompte);
      }
      
      // Priorité 3: id utilisateur
      if (cookieUser.id) {
        return String(cookieUser.id);
      }
    }

    // 3) Essayer depuis le localStorage (dernier recours)
    if (typeof window !== 'undefined') {
      try {
        const lsUser = JSON.parse(localStorage?.getItem('user') || '{}');
        
        if (lsUser?.clientId) return String(lsUser.clientId);
        if (lsUser?.id) return String(lsUser.id);
        if (lsUser?.typeCompte) return String(lsUser.typeCompte);
      } catch (e) {
        // Ignorer les erreurs silencieusement
      }
    }
    return undefined;
  } catch (error) {
    console.error('Erreur lors de la récupération du clientId:', error);
    return undefined;
  }
};

/**
 * Récupère l'ID du client ou lève une erreur si non trouvé
 * @returns L'ID du client
 * @throws {Error} Si l'ID du client n'est pas trouvé
 */
export const requireClientId = (): string => {
  const clientId = getClientId();
  if (!clientId) {
    console.error('ClientId non trouvé');
    // Rediriger vers la page de connexion
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('ClientId non trouvé. Veuillez vous reconnecter.');
  }
  return clientId;
};
