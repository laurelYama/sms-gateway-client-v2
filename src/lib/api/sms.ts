import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';
import { API_BASE_URL } from '@/config/api';

interface MessageUnides {
  ref: string;
  type: string;
  destinataire: string;
  corps: string;
  emetteur: string;
  clientId: string;
  statut: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageMuldes {
  ref: string;
  clientId: string;
  emetteur: string;
  corps: string;
  type: string;
  statut: string;
  createdAt: string;
  Destinataires: string[];
}

type Message = MessageUnides | MessageMuldes;

interface ApiResponse {
  data: Message[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const fetchMessages = async (
  type: 'unides' | 'muldes' | 'muldesp', 
  page: number = 1, 
  pageSize: number = 5
): Promise<ApiResponse> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  // Récupérer l'utilisateur connecté
  const user = getUserFromCookies();
  if (!user || !user.id) throw new Error('Utilisateur non connecté');
  
  // Construire l'URL en fonction du type de message
  let url: string;
  
  switch (type) {
    case 'unides':
      url = `${API_BASE_URL}/api/V1/sms/unides/${user.id}`;
      break;
    case 'muldes':
      url = `${API_BASE_URL}/api/V1/sms/muldes/${user.id}`;
      break;
    case 'muldesp':
      url = `${API_BASE_URL}/api/V1/sms/muldesp/${user.id}`;
      break;
    default:
      throw new Error(`Type de message non supporté: ${type}`);
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des messages');
  }

  const data = await response.json();
  
  // Implémentation de la pagination côté client
  const startIndex = (page - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);
  
  return {
    data: paginatedData,
    total: data.length,
    page,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize),
  };
};
