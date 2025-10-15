import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';

const API_URL = 'https://api-smsgateway.solutech-one.com/api/V1';

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
  
  const url = `${API_URL}/sms/${type}/${user.id}`;
  
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
