'use client';

import { useState, useEffect } from 'react';
import { getCreditHistory } from '@/lib/api/credits';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function CreditHistory() {
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        // Remplacez '700002' par l'ID du client connecté
        const data = await getCreditHistory('700002');
        setHistory(data);
      } catch (err) {
        console.error('Erreur lors de la récupération de l\'historique:', err);
        setError('Impossible de charger l\'historique des crédits');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <div className="p-4">Chargement de l'historique en cours...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!history || history.empty) {
    return <div className="p-4">Aucun historique de crédits trouvé.</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">En attente</Badge>;
      case 'APPROVED':
        return <Badge variant="default">Approuvé</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Historique des demandes de crédits</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Montant estimé</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.content.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.requestCode}</TableCell>
                <TableCell>
                  {format(new Date(item.createdAt), 'PPpp', { locale: fr })}
                </TableCell>
                <TableCell>{item.quantity} crédits</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>
                  {item.estimatedAmountTtc 
                    ? `${item.estimatedAmountTtc} € TTC` 
                    : 'Non calculé'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
