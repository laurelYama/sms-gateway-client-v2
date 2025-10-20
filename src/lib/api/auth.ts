import { API_CONFIG } from "@/lib/config";

interface ForgotPasswordData {
  email: string;
}

interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  try {
    const url = API_CONFIG.getForgotPasswordUrl();
    console.log('Envoi de la demande de réinitialisation à:', url);
    console.log('Données envoyées:', { email });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        email,
        // Utiliser directement l'URL de la page de réinitialisation
        resetUrl: `${API_CONFIG.FRONTEND_URL}/reset-password?token={TOKEN}`
      }),
    });

    console.log('Réponse reçue - Statut:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('Réponse brute:', responseText);
    
    let responseData = {};
    
    if (responseText && responseText.trim().startsWith('{')) {
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Erreur de parsing JSON:', e);
        // Si le parsing échoue mais que le statut est 200, on considère que c'est un succès
        if (response.ok) {
          return { message: 'Un email de réinitialisation a été envoyé avec succès.' };
        }
        throw new Error('Réponse invalide du serveur. Le format de la réponse est incorrect.');
      }
    } else if (response.ok) {
      // Si la réponse n'est pas du JSON mais que le statut est OK
      return { message: 'Un email de réinitialisation a été envoyé avec succès.' };
    }

    if (!response.ok) {
      const errorMessage = responseData.message || 
                         (response.status === 404 ? 'Service de réinitialisation de mot de passe non trouvé' :
                          response.status === 400 ? 'Adresse email invalide' :
                          'Une erreur est survenue lors de la demande de réinitialisation');
      
      throw new Error(errorMessage);
    }

    return responseData;
  } catch (error: any) {
    console.error('Erreur dans forgotPassword:', error);
    throw new Error(error.message || 'Erreur de connexion au serveur');
  }
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
  try {
    // Validation des entrées
    if (!token) {
      console.error('[resetPassword] Token manquant');
      throw new Error('Le lien de réinitialisation est invalide.');
    }

    if (!newPassword || newPassword.length < 8) {
      console.error('[resetPassword] Mot de passe trop court');
      throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
    }

    // Construction de l'URL avec le token en paramètre
    const baseUrl = API_CONFIG.getResetPasswordUrl();
    const url = `${baseUrl}?token=${encodeURIComponent(token)}`;
    
    console.log('[resetPassword] URL complète de l\'API:', url);
    
    // Préparation de la requête selon le format attendu par l'API
    const requestOptions = {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ newPassword })
    };
    
    console.log('[resetPassword] Envoi de la requête avec options:', {
      method: 'POST',
      url,
      headers: requestOptions.headers,
      body: { 
        newPassword: '[PROTECTED]' // Ne pas logger le mot de passe
      }
    });

    // Envoi de la requête
    let response;
    try {
      response = await fetch(url, requestOptions);
      console.log('[resetPassword] Réponse reçue - Statut:', response.status, response.statusText);
    } catch (networkError) {
      console.error('[resetPassword] Erreur réseau:', networkError);
      throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion Internet.');
    }

    // Traitement de la réponse
    const responseText = await response.text();
    console.log('[resetPassword] Réponse brute:', responseText);
    
    let responseData = {};
    
    // Tenter de parser la réponse JSON
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
        console.log('[resetPassword] Réponse parsée:', responseData);
      } catch (e) {
        console.warn('[resetPassword] La réponse n\'est pas au format JSON');
        // On continue même si le parsing échoue
      }
    }

    // Gestion des erreurs HTTP
    if (!response.ok) {
      const errorInfo = {
        status: response.status,
        statusText: response.statusText,
        url: url,
        responseText: responseText
      };
      
      console.error('[resetPassword] Erreur HTTP:', errorInfo);
      
      // Déterminer le message d'erreur approprié
      let errorMessage: string;
      
      if (typeof responseData === 'object' && responseData !== null && 'message' in responseData) {
        errorMessage = String(responseData.message);
      } else {
        // Messages d'erreur par défaut selon le code d'état HTTP
        switch (response.status) {
          case 400:
            errorMessage = 'Requête invalide. Vérifiez que votre mot de passe respecte les exigences.';
            break;
          case 401:
            errorMessage = 'Le lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.';
            break;
          case 404:
            errorMessage = 'Service de réinitialisation de mot de passe non disponible.';
            break;
          case 500:
            errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
            break;
          default:
            errorMessage = `Erreur ${response.status}: ${response.statusText || 'Erreur inconnue'}`;
        }
      }
      
      // Créer une erreur avec plus d'informations
      const error = new Error(errorMessage);
      Object.assign(error, { 
        status: response.status,
        response: responseData,
        isApiError: true 
      });
      
      throw error;
    }

    // Si on arrive ici, la requête a réussi
    return { 
      message: (responseData as { message?: string }).message || 'Votre mot de passe a été réinitialisé avec succès.' 
    };
    
  } catch (error: any) {
    console.error('[resetPassword] Erreur détaillée:', {
      message: error.message,
      name: error.name,
      status: error.status,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      response: error.response
    });
    
    // Si l'erreur est déjà une instance de Error, on la propage
    if (error instanceof Error) {
      throw error;
    }
    
    // Sinon, on crée une nouvelle erreur
    throw new Error(typeof error === 'string' ? error : 'Erreur inconnue lors de la réinitialisation du mot de passe');
  }
};
