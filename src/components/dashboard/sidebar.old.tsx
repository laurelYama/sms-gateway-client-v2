'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Settings, Users, History, ChevronDown, User as UserIcon, CreditCard, FileText, Clock, Megaphone, Key, Ticket } from 'lucide-react';
import { getUserFromCookies, UserPayload } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/ui/logout-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarProps {
  onClose?: () => void;
}

type NavItem = {
  name: string;
  href: string;
  icon: any;
  description?: string;
  subItems?: {
    name: string;
    href: string;
    icon: any;
    description?: string;
  }[];
  customComponent?: React.ReactNode;
};

const getNavItems = (): NavItem[] => [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: "Vue d'ensemble de votre activité et des statistiques",
  },
  {
    name: 'Messages',
    href: '/dashboard/messages',
    icon: MessageSquare,
    subItems: [
      {
        name: 'Message simple',
        href: '/dashboard/messages/simple',
        icon: MessageSquare,
        description: 'Envoyer un SMS à un ou plusieurs numéros',
      },
      {
        name: 'Message de groupe',
        href: '/dashboard/messages/group',
        icon: Users,
        description: 'Envoyer un SMS à un groupe de contacts',
      },
      {
        name: 'Message programmé',
        href: '/dashboard/messages/programme',
        icon: Clock,
        description: "Planifier l'envoi de vos SMS",
      },
      {
        name: 'Historique',
        href: '/dashboard/messages/historique',
        icon: History,
        description: "Consulter l'historique de vos envois",
      },
    ],
    description: 'Envoyez et gérez vos campagnes SMS',
  },
  {
    name: 'Mes Groupes',
    href: '/dashboard/groupes',
    icon: Users,
    description: 'Organiser vos contacts par groupes',
  },
  {
    name: 'Mes Contacts',
    href: '/dashboard/contacts',
    icon: Users,
    description: 'Gérer vos contacts et vos importations',
  },

  {
    name: 'Mes Émetteurs',
    href: '/dashboard/emetteur',
    icon: Megaphone,
    description: 'Gérer vos noms d’émetteur (Sender ID)',
  },
  {
    name: 'Clé API',
    href: '/dashboard/api-keys',
    icon: Key,
    description: 'Générer et gérer vos clés API',
  },
  {
    name: 'Tickets',
    href: '/dashboard/tickets',
    icon: Ticket,
    description: 'Ouvrir et suivre vos tickets de support',
  }
];

// Composant pour afficher l'élément de menu conditionnel
const BillingItem = ({ user }: { user: UserPayload | null }) => {
  const pathname = usePathname();
  // If user is not available, show both entries so user can still navigate
  if (!user || !user.typeCompte) {
    return (
      <div className="space-y-1">
        <Link
          href="/dashboard/commandes"
          title="Commander des crédits SMS"
          className={cn(
            'flex items-center px-4 py-3 text-sm font-medium rounded-md',
            pathname.startsWith('/dashboard/commandes')
              ? 'bg-primary/10 text-primary'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <CreditCard className={cn('w-5 h-5 mr-3', pathname.startsWith('/dashboard/commandes') && 'text-primary')} />
          Commande
        </Link>
        <Link
          href="/dashboard/factures"
          title="Consulter et télécharger vos factures"
          className={cn(
            'flex items-center px-4 py-3 text-sm font-medium rounded-md',
            pathname.startsWith('/dashboard/factures')
              ? 'bg-primary/10 text-primary'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <FileText className={cn('w-5 h-5 mr-3', pathname.startsWith('/dashboard/factures') && 'text-primary')} />
          Facture
        </Link>
      </div>
    );
  }

  const billingLabel = user.typeCompte === 'PREPAYE' ? 'Commande' : 'Facture';
  const billingHref = user.typeCompte === 'PREPAYE' ? '/dashboard/commandes' : '/dashboard/factures';
  const BillingIcon = user.typeCompte === 'PREPAYE' ? CreditCard : FileText;
  const billingDescription = user.typeCompte === 'PREPAYE'
    ? 'Commander des crédits SMS'
    : 'Consulter et télécharger vos factures';

  const isActive = pathname.startsWith(billingHref);

  return (
    <Link
      href={billingHref}
      title={billingDescription}
      className={cn(
        'flex items-center px-4 py-3 text-sm font-medium rounded-md',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      )}
    >
      <BillingIcon className="mr-3 h-5 w-5 flex-shrink-0" />
      {billingLabel}
    </Link>
  );
};

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // Charger les données utilisateur
  useEffect(() => {
    const userData = getUserFromCookies();
    setUser(userData);
    setLoading(false);
  }, []);

  // Gestion des menus ouverts/fermés
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {};
    
    // Trouver l'élément de menu actif
    for (const item of getNavItems()) {
      if (pathname === item.href) {
        newOpenMenus[item.name] = true;
        break;
      }
      
      if (item.subItems) {
        const hasActiveChild = item.subItems.some(subItem => 
          pathname.startsWith(subItem.href)
        );
        if (hasActiveChild) {
          newOpenMenus[item.name] = true;
          break;
        }
      }
    }
    
    setOpenMenus(newOpenMenus);
  }, [pathname]);

  // Fermer le sidebar après la navigation sur mobile
  useEffect(() => {
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  }, [pathname, onClose]);

  // Gestion de la touche Échap pour fermer le sidebar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  };

  // Mettre à jour les éléments de navigation avec l'utilisateur chargé
  const navItems = React.useMemo(() => {
    const items: NavItem[] = [
      {
        name: 'Tableau de bord',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: "Vue d'ensemble de votre activité et des statistiques",
      },
      {
        name: 'Messages',
        href: '/dashboard/messages',
        icon: MessageSquare,
        subItems: [
          {
            name: 'Message simple',
            href: '/dashboard/messages/simple',
            icon: MessageSquare,
            description: 'Envoyer un SMS à un ou plusieurs numéros',
          },
          {
            name: 'Message de groupe',
            href: '/dashboard/messages/group',
            icon: Users,
            description: 'Envoyer un SMS à un groupe de contacts',
          },
          {
            name: 'Message programmé',
            href: '/dashboard/messages/programme',
            icon: Clock,
            description: "Planifier l'envoi de vos SMS",
          },
          {
            name: 'Historique',
            href: '/dashboard/messages/historique',
            icon: History,
            description: "Consulter l'historique de vos envois",
          },
        ],
        description: 'Envoyez et gérez vos campagnes SMS',
      },
      {
        name: 'Mes Groupes',
        href: '/dashboard/groupes',
        icon: Users,
        description: 'Organiser vos contacts par groupes',
      },
      {
        name: 'Mes Contacts',
        href: '/dashboard/contacts',
        icon: Users,
        description: 'Gérer vos contacts et vos importations',
      },
      {
        name: 'Mes Émetteurs',
        href: '/dashboard/emetteur',
        icon: Megaphone,
        description: 'Gérer vos noms d\'émetteur (Sender ID)',
      },
      {
        name: 'Clé API',
        href: '/dashboard/api-keys',
        icon: Key,
        description: 'Générer et gérer vos clés API',
      },
      {
        name: 'Tickets',
        href: '/dashboard/tickets',
        icon: Ticket,
        description: 'Ouvrir et suivre vos tickets de support',
      },
      {
        name: 'Facturation',
        href: '#',
        icon: CreditCard,
        description: 'Gérez vos commandes et factures',
        customComponent: <BillingItem user={user} />
      }
    ];
    return items;
  }, [user]);

  // Fonction pour trouver l'élément actif
  const findActiveItems = () => {
    for (const item of navItems) {
      if (item.subItems) {
        const activeSubItem = item.subItems.find(subItem => 
          pathname.startsWith(subItem.href)
        );
        if (activeSubItem) {
          return { activeItem: item, activeSubItem };
        }
      } else if (pathname === item.href) {
        return { activeItem: item, activeSubItem: null };
      }
    }
    return { activeItem: null, activeSubItem: null };
  };

  const { activeItem, activeSubItem } = findActiveItems();

  // Fonction pour basculer l'état d'ouverture d'un menu
  const toggleMenu = React.useCallback((menuName: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  }, []);

  // Fonction pour rendre un élément de navigation
  const renderNavItem = React.useCallback((item: NavItem) => {
    // Si l'élément a un composant personnalisé, on le retourne directement
    if (item.customComponent) {
      return (
        <div key={`custom-${item.name}`} className="mt-2">
          {item.customComponent}
        </div>
      );
    }

    const isActive = activeItem?.name === item.name;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isMenuOpen = openMenus[item.name] || false;
    
    return (
      <div key={`nav-item-${item.name}`} className="space-y-1">
        <div className="relative">
          <Link
            href={item.href}
            onClick={(e) => {
              if (hasSubItems) {
                e.preventDefault();
                toggleMenu(item.name);
              }
            }}
            className={cn(
              'flex items-center px-4 py-3 text-sm font-medium rounded-md',
              isActive ? 'text-primary font-semibold' : 'text-gray-600 hover:bg-gray-100',
              hasSubItems && 'cursor-pointer'
            )}
            title={item.description}
          >
            <item.icon className={cn("w-5 h-5 mr-3", isActive && "text-primary")} />
            {item.name}
            {hasSubItems && (
              <ChevronDown className={cn(
                "ml-auto h-4 w-4 transition-transform",
                isMenuOpen ? "rotate-180" : ""
              )} />
            )}
          </Link>
        </div>
        
        {/* Afficher les sous-onglets si le menu est ouvert */}
        {hasSubItems && isMenuOpen && (
          <div className="ml-6 space-y-1">
            {item.subItems.map((subItem, index) => {
              const isSubActive = pathname === subItem.href;
              return (
                <Link
                  key={`subitem-${item.name}-${index}`}
                  href={subItem.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm rounded-md',
                    isSubActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-500 hover:bg-gray-50',
                  )}
                  title={subItem.description}
                >
                  <subItem.icon className="w-4 h-4 mr-2" />
                  {subItem.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }, [pathname, openMenus, activeItem, toggleMenu]);

  if (loading) {
    return (
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 h-screen border-r border-gray-200 bg-white">
          <div className="p-4">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fermer le sidebar après la navigation sur mobile
  useEffect(() => {
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  }, [pathname, onClose]);

  const sidebarContent = useMemo(() => (
    <div 
      className="flex flex-col w-64 h-full border-r border-gray-200 bg-white"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Logo */}
      <div className="flex-shrink-0 flex items-center justify-center h-16 px-4 mt-2">
        <Image
          src="/Logo_ION-1-removebg-preview 1.png"
          alt="Logo"
          width={140}
          height={28}
          priority
        />
      </div>
      
      {/* Navigation */}
      <div className="flex-1 flex flex-col min-h-0">
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {navItems.map((item) => renderNavItem(item))}
        </nav>
        
        {/* Profile Section - Toujours en bas */}
        <div className="flex-shrink-0 border-t border-border bg-white">
          <div className="flex items-center px-4 py-3">
            <Avatar className="h-9 w-9 border border-border flex-shrink-0">
              <AvatarImage src="" alt="" />
              <AvatarFallback className="bg-primary/10 text-primary">
                {user ? (
                  `${user?.prenom?.charAt(0) || ''}${user?.nom?.charAt(0) || 'U'}`
                ) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : 'Utilisateur'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || 'email@example.com'}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profil" className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Paramètres</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <LogoutButton className="w-full justify-start cursor-pointer" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
