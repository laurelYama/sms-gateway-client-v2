'use client';

import { Menu, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useClientInfo } from '@/hooks/useClientInfo';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();

  // Titre pour la barre supérieure
  const pageTitle = 'SMS Gateway';

  const { clientInfo, loading } = useClientInfo();

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-start justify-between px-4 py-3 md:px-6 md:py-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">
            {pageTitle}
          </h1>
          
          <div className="flex items-center space-x-2 mt-1">
            {loading ? (
              <>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </>
            ) : clientInfo ? (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Ref. client:</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {clientInfo.idclients}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2 ml-2">
                  <span className="text-xs text-gray-500">Type de compte:</span>
                  <Badge 
                    variant={clientInfo.typeCompte === 'PREPAYE' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {clientInfo.typeCompte === 'PREPAYE' ? 'Prépayé' : 'Postpayé'}
                  </Badge>
                </div>
              </>
            ) : null}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={async () => {
              try {
                const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1];
                if (!token) {
                  window.location.href = '/login';
                  return;
                }
                
                const response = await fetch('https://api-smsgateway.solutech-one.com/api/V1/documents/download/Documentation_SMS_Gateway_V1(1).pdf', {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                
                if (!response.ok) throw new Error('Échec du téléchargement');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Documentation_SMS_Gateway.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                
                toast.success('La documentation est en cours de téléchargement');
              } catch (error) {
                console.error('Erreur lors du téléchargement:', error);
                toast.error('Impossible de télécharger la documentation');
              }
            }}
            title="Télécharger la documentation"
          >
            <Download className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
