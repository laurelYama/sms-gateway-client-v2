'use client';

import { Menu, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
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
            asChild
            title="Télécharger la documentation"
          >
            <a
              href="https://api-smsgateway.solutech-one.com/api/V1/documents/download/f58a58af-be16-42f7-992e-88ac18f8757a_Documentation_SMS_Gateway.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-5 w-5" />
            </a>
          </Button>
          
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
