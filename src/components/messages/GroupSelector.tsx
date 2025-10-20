'use client';

import { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronRight, User, Check } from 'lucide-react';
import { fetchContacts } from '@/lib/api/contacts';
import { useToast } from '@/components/ui/use-toast';

interface ContactInfo {
  number: string;
  countryCode: string;
  fullNumber: string;
  contactName?: string;
}

type ContactSelection = string | ContactInfo;

interface GroupSelectorProps {
  onSelectContacts: (contacts: ContactSelection[]) => void;
  selectedContacts: ContactSelection[];
}

export default function GroupSelector({ onSelectContacts, selectedContacts }: GroupSelectorProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupContacts, setGroupContacts] = useState<Record<string, Array<{contactNumber: string, contactName: string}>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Charger les groupes
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?.id) return;
        
        const response = await fetch(`/api/groups?userId=${user.id}`);
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les groupes',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, [toast]);

  // Charger les contacts d'un groupe
  const loadGroupContacts = async (groupId: string) => {
    try {
      if (groupContacts[groupId]) {
        setExpandedGroup(expandedGroup === groupId ? null : groupId);
        return;
      }

      const contacts = await fetchContacts({ groupId });
      setGroupContacts(prev => ({
        ...prev,
        [groupId]: contacts
      }));
      setExpandedGroup(groupId);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts du groupe:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les contacts du groupe',
        variant: 'destructive',
      });
    }
  };

  // Basculer la sélection d'un contact
  const toggleContactSelection = (contactNumber: string, contactName: string = '') => {
    // Nettoyer le numéro
    const cleanedNumber = contactNumber.replace(/\D/g, '');
    
    // Extraire l'indicatif pays (241 pour le Gabon)
    let number = cleanedNumber;
    let countryCode = 'GA'; // Par défaut
    
    if (cleanedNumber.startsWith('241') && cleanedNumber.length > 3) {
      countryCode = 'GA';
      number = cleanedNumber.substring(3);
    } else if (cleanedNumber.startsWith('33') && cleanedNumber.length > 2) {
      countryCode = 'FR';
      number = cleanedNumber.substring(2);
    } else if (cleanedNumber.match(/^[0-9]{9}$/)) {
      countryCode = 'GA';
      number = cleanedNumber;
    }
    
    const fullNumber = countryCode === 'GA' 
      ? `241${number}` 
      : countryCode === 'FR' 
        ? `33${number}` 
        : number;

    const contactInfo: ContactInfo = {
      number,
      countryCode,
      fullNumber,
      contactName: contactName || undefined
    };

    onSelectContacts(
      selectedContacts.some(c => 
        typeof c === 'string' ? c === contactNumber : c.fullNumber === fullNumber
      )
        ? selectedContacts.filter(c => 
            typeof c === 'string' 
              ? c !== contactNumber 
              : c.fullNumber !== fullNumber
          )
        : [...selectedContacts, contactInfo]
    );
  };

  // Gérer la sélection/désélection d'un groupe entier
  const toggleGroupSelection = (groupId: string) => {
    const groupContactsList = groupContacts[groupId] || [];
    const allGroupContactsSelected = groupContactsList.every(contact => 
      selectedContacts.some(selected => 
        typeof selected === 'string' 
          ? selected === contact.contactNumber 
          : selected.fullNumber === contact.contactNumber
      )
    );

    if (allGroupContactsSelected) {
      // Désélectionner tous les contacts du groupe
      const groupContactNumbers = groupContactsList.map(c => c.contactNumber);
      onSelectContacts(
        selectedContacts.filter(contact => 
          typeof contact === 'string'
            ? !groupContactNumbers.includes(contact)
            : !groupContactNumbers.includes(contact.fullNumber)
        )
      );
    } else {
      // Sélectionner tous les contacts du groupe
      const newSelections = groupContactsList.map(contact => ({
        number: contact.contactNumber,
        countryCode: 'GA',
        fullNumber: contact.contactNumber,
        contactName: contact.contactName
      }));
      
      const existingNumbers = new Set(
        selectedContacts.map(c => typeof c === 'string' ? c : c.fullNumber)
      );
      const uniqueNewSelections = newSelections.filter(
        contact => !existingNumbers.has(contact.fullNumber)
      );
      
      onSelectContacts([...selectedContacts, ...uniqueNewSelections]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-muted/30 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground text-sm">
        Aucun groupe disponible
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map(group => (
        <div key={group.id} className="border rounded-md overflow-hidden">
          <div 
            className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
            onClick={() => loadGroupContacts(group.id)}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">{group.name}</span>
            </div>
            {expandedGroup === group.id ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
          
          {expandedGroup === group.id && (
            <div className="border-t bg-muted/10 p-2 space-y-1">
              {groupContacts[group.id]?.length > 0 ? (
                <>
                  <div className="flex justify-between items-center p-2">
                    <span className="text-sm">Tous les contacts</span>
                    <button
                      className="text-sm text-primary hover:no-underline cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupSelection(group.id);
                      }}
                    >
                      {groupContacts[group.id].every(contact => 
                        selectedContacts.some(selected => 
                          typeof selected === 'string' 
                            ? selected === contact.contactNumber 
                            : selected.fullNumber === contact.contactNumber
                        )
                      ) ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>
                  {groupContacts[group.id].map((contact) => {
                    const isSelected = selectedContacts.some(selected => 
                      typeof selected === 'string' 
                        ? selected === contact.contactNumber 
                        : selected.fullNumber === contact.contactNumber
                    );
                    
                    return (
                      <div 
                        key={contact.contactNumber}
                        className={`flex items-center p-2 rounded cursor-pointer group ${
                          isSelected
                            ? 'bg-blue-50 border-l-4 border-blue-500 pl-3'
                            : 'hover:bg-gray-50 pl-4 border-l-4 border-transparent'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleContactSelection(contact.contactNumber, contact.contactName);
                        }}
                      >
                        <div className="flex items-center">
                          <div className="relative mr-3">
                            <User className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-muted-foreground'}`} />
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className={`text-sm ${isSelected ? 'font-medium text-blue-800' : 'text-gray-900'}`}>
                              {contact.contactName || contact.contactNumber}
                            </p>
                            {contact.contactName && (
                              <p className="text-xs text-muted-foreground">
                                {contact.contactNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Chargement des contacts...
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
