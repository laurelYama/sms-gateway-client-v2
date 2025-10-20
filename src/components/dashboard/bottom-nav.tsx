'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Users, Settings, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Messages',
    href: '/dashboard/messages',
    icon: MessageSquare,
  },
  {
    name: 'Contacts',
    href: '/dashboard/contacts',
    icon: Users,
  },
  {
    name: 'Groupes',
    href: '/dashboard/groupes',
    icon: Users,
  },
  {
    name: 'Paramètres',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-around py-2 px-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
                        (item.href !== '/' && pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center p-2 rounded-lg transition-colors',
              isActive 
                ? 'text-primary' 
                : 'text-gray-500 hover:text-gray-700',
              item.isActive && 'font-medium',
              item.isAction ? 'mt-[-24px]' : ''
            )}
          >
            <div className={cn(
              'p-2 rounded-full',
              isActive && 'bg-primary/10',
              item.isAction && 'bg-primary text-white rounded-full p-3 shadow-lg'
            )}>
              <item.icon className={cn('w-5 h-5', item.isAction && 'w-6 h-6')} />
            </div>
            <span className={cn(
              'text-xs mt-1',
              isActive ? 'text-primary' : 'text-gray-500',
              item.isAction && 'sr-only'
            )}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
