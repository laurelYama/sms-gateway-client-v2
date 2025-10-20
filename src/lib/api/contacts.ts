import { getTokenFromCookies, getUserFromCookies } from '../auth';

export interface ClientsGroup {
  idClientsGroups: string;
  nomGroupe: string;
  descriptionGroupe: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  idClientsContacts?: string;
  contactNumber: string;
  contactName: string;
  groupId?: string;
  clientsGroup?: ClientsGroup;
  clientId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactSearchParams {
  query?: string;
  clientId?: string;
  groupId?: string;
  countOnly?: boolean;
}

const API_BASE_URL = 'https://api-smsgateway.solutech-one.com/api/V1';

/**
 * Récupère les contacts avec filtrage optionnel
 * @param searchParams Paramètres de recherche
 * @returns Liste des contacts ou nombre de contacts si countOnly est vrai
 */
export async function fetchContacts(searchParams?: ContactSearchParams): Promise<Contact[] | number> {
  // Récupérer l'utilisateur connecté
  const user = getUserFromCookies();
  if (!user || !user.id) throw new Error('Utilisateur non connecté');
  
  // Utiliser l'ID client de l'utilisateur connecté
  const clientId = searchParams?.clientId || user.id;
  let url = `${API_BASE_URL}/contacts/client/${clientId}`;
  
  // Si on a un terme de recherche, on l'ajoute à l'URL
  if (searchParams?.query) {
    url = `${url}/search?q=${encodeURIComponent(searchParams.query)}`;
  }
  try {
    const token = getTokenFromCookies();
    console.log('Token récupéré:', token ? '***' : 'Aucun token trouvé');
    
    if (!token) {
      console.error('Erreur: Aucun token d\'authentification trouvé');
      window.location.href = '/login';
      return [];
    }

    // Si on a un groupId, on utilise l'endpoint de groupe
    if (searchParams?.groupId) {
      url = `${API_BASE_URL}/contacts/group/${searchParams.groupId}`;
    }
    
    console.log('Tentative de récupération des contacts depuis:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Réponse du serveur:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Erreur de réponse:', response.status, response.statusText, responseText);
      
      if (response.status === 401) {
        console.error('Erreur 401: Non autorisé - Redirection vers la page de connexion');
        window.location.href = '/login';
        return [];
      }
      
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    try {
      // Essayer de parser la réponse en JSON
      const data = JSON.parse(responseText);
      console.log('Données brutes de l\'API:', data);
      
      // Vérifier si la réponse est un tableau
      if (Array.isArray(data)) {
        console.log('Contacts traités:', data);
        return data as Contact[];
      }
      
      // Si ce n'est pas un tableau, essayer d'extraire un tableau d'une propriété
      console.warn('La réponse de l\'API n\'est pas un tableau. Type reçu:', typeof data, 'Valeur:', data);
      const possibleArray = data?.data || data?.items || data?.contacts;
      
      if (Array.isArray(possibleArray)) {
        console.log('Tableau trouvé dans une propriété de l\'objet:', possibleArray);
        return possibleArray as Contact[];
      }
      
      console.warn('Aucun tableau valide trouvé dans la réponse');
      return [];
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      console.error('Contenu de la réponse:', responseText);
      // Retourner un tableau vide au lieu de planter l'application
      return [];
    }
  } catch (error) {
    console.error('Erreur API:', error);
    if (error instanceof Error && error.message.includes('401')) {
      window.location.href = '/login';
    }
    throw error;
  }
}

// Créer un nouveau contact
export async function createContact(contactData: Omit<Contact, 'id'>): Promise<Contact> {
  try {
    const token = getTokenFromCookies();
    if (!token) throw new Error('Non authentifié');

    const response = await fetch(`${API_BASE_URL}/contacts/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        groupId: contactData.groupId,
        number: contactData.contactNumber,
        name: contactData.contactName
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la création du contact');
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la création du contact:', error);
    throw error;
  }
}

// Mettre à jour un contact
export async function updateContact(contactId: string, contactData: { number: string; name: string }): Promise<Contact> {
  const token = getTokenFromCookies();
  
  if (!token) {
    throw new Error('Non authentifié');
  }

  try {
    console.log('Mise à jour du contact:', { contactId, contactData });
    
    const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        number: contactData.number,
        name: contactData.name
      })
    });

    console.log('Réponse de la mise à jour:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erreur de l\'API:', errorData);
      throw new Error(errorData.message || `Erreur ${response.status} lors de la mise à jour du contact`);
    }

    const updatedContact = await response.json();
    console.log('Contact mis à jour avec succès:', updatedContact);
    return updatedContact;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du contact:', error);
    throw error;
  }
}

// Importer des contacts depuis un fichier CSV
export async function importContactsCSV(groupId: string, file: File): Promise<any> {
  const token = getTokenFromCookies();
  
  if (!token) {
    throw new Error('Non authentifié');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/contacts/import/${groupId}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de l\'import des contacts');
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de l\'import CSV:', error);
    throw error;
  }
}

// Importer des contacts depuis un fichier XLSX
export async function importContactsXLSX(groupId: string, file: File): Promise<any> {
  const token = getTokenFromCookies();
  
  if (!token) {
    throw new Error('Non authentifié');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/contacts/import-xlsx/${groupId}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de l\'import des contacts XLSX');
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de l\'import XLSX:', error);
    throw error;
  }
}

// Supprimer un contact
export async function deleteContact(contactId: string): Promise<void> {
  try {
    const token = getTokenFromCookies();
    
    if (!token) {
      throw new Error('Non authentifié');
    }

    console.log('Suppression du contact avec l\'ID:', contactId);
    
    const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
      method: 'DELETE',
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Réponse de la suppression:', response.status, response.statusText);
    
    if (!response.ok) {
      let errorMessage = `Erreur ${response.status} lors de la suppression du contact`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // En cas d'erreur de parsing de la réponse d'erreur
        console.error('Erreur lors de la lecture de la réponse d\'erreur:', e);
      }
      throw new Error(errorMessage);
    }
    
    console.log('Contact supprimé avec succès');
  } catch (error) {
    console.error('Erreur lors de la suppression du contact:', error);
    throw error;
  }
}

// Déplacer un contact vers un autre groupe
export async function moveContact(contactId: string, targetGroupId: string): Promise<void> {
  try {
    const token = getTokenFromCookies();
    if (!token) throw new Error('Non authentifié');

    const response = await fetch(`${API_BASE_URL}/contacts/${contactId}/move`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetGroupId
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors du déplacement du contact');
    }
  } catch (error) {
    console.error('Erreur lors du déplacement du contact:', error);
    throw error;
  }
}

/**
 * Compte le nombre de contacts dans un groupe spécifique
 * @param groupId ID du groupe
 * @returns Nombre de contacts dans le groupe
 */
export async function countContactsInGroup(groupId: string): Promise<number> {
  try {
    const token = getTokenFromCookies();
    if (!token) throw new Error('Non authentifié');
    
    const clientId = getClientId();
    if (!clientId) throw new Error('ID client non trouvé');
    
    const response = await fetch(
      API_ENDPOINTS.CONTACTS_BY_GROUP(clientId, groupId),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }
    
    const contacts = await response.json();
    if (!Array.isArray(contacts)) {
      console.error('La réponse de l\'API n\'est pas un tableau:', contacts);
      return 0;
    }
    console.log(`[DEBUG] ${contacts.length} contacts trouvés pour le groupe ${groupId}`);
    return contacts.length;
    
  } catch (error) {
    console.error('Erreur lors du comptage des contacts:', error);
    return 0;
  }
}

// Importer des contacts depuis un fichier CSV
export async function importContactsFromCSV(groupId: string, file: File): Promise<any> {
  try {
    const token = getTokenFromCookies();
    if (!token) throw new Error('Non authentifié');

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/contacts/import/${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de l\'importation des contacts');
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de l\'importation des contacts:', error);
    throw error;
  }
}
