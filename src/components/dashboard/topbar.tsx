'use client';

import { useState } from 'react';
import { Menu, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export function Topbar() {
  const pathname = usePathname();

  // Obtenir le titre de la page actuelle
  const getPageTitle = () => {
    const path = pathname.split('/').pop() || 'Tableau de bord';
    return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="ml-2 text-xl font-semibold text-gray-900">
            {getPageTitle()}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              // Créer un lien de téléchargement pour la documentation
              const link = document.createElement('a');
              link.href = '/Documentation SMS Gateway.pdf';
              link.download = 'Documentation_SMS_Gateway.pdf';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
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
