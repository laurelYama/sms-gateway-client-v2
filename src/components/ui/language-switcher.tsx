'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const languages = [
  {
    code: 'fr',
    label: 'Français',
    flag: 'https://flagcdn.com/w40/fr.png'
  },
  {
    code: 'en',
    label: 'English',
    flag: 'https://flagcdn.com/w40/gb.png'
  },
  {
    code: 'es',
    label: 'Español',
    flag: 'https://flagcdn.com/w40/es.png'
  }
] as const;

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('es');

  const currentLanguage = languages.find((lang) => lang.code === selectedLanguage) || languages[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 px-3 flex items-center gap-2"
          title={currentLanguage?.label}
        >
          {currentLanguage ? (
            <>
              <img 
                src={currentLanguage.flag} 
                alt={currentLanguage.code} 
                className="w-5 h-4 object-cover rounded-sm"
                loading="lazy"
              />
              <span className="text-sm font-medium">{currentLanguage.code.toUpperCase()}</span>
            </>
          ) : (
            <Languages className="h-5 w-5" />
          )}
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher une langue..." />
          <CommandEmpty>Aucune langue trouvée.</CommandEmpty>
          <CommandGroup>
            {languages.map((language) => (
              <CommandItem
                key={language.value}
                value={language.value}
                onSelect={() => {
                  setSelectedLanguage(language.code);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedLanguage === language.code ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <img 
                  src={language.flag} 
                  alt={language.code}
                  className="w-5 h-4 object-cover rounded-sm mr-2"
                  loading="lazy"
                />
                <span className="text-sm">{language.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{language.code.toUpperCase()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
