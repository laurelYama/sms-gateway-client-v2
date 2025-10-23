'use client';

import { Menu, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();

  // Titre fixe pour la barre supérieure
  const pageTitle = 'SMS Gateway';

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="ml-2 text-lg md:text-xl font-semibold text-gray-900">
            {pageTitle}
          </h1>
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
                
                const response = await fetch('https://api-smsgateway.solutech-one.com/api/V1/documents/download/Documentation_SMS_Gateway.pdf', {
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
                
                toast({
                  title: 'Téléchargement démarré',
                  description: 'La documentation est en cours de téléchargement',
                });
              } catch (error) {
                console.error('Erreur lors du téléchargement:', error);
                toast({
                  title: 'Erreur',
                  description: 'Impossible de télécharger la documentation',
                  variant: 'destructive',
                });
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
