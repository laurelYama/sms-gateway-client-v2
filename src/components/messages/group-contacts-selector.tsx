'use client';

import { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronRight, Check, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';
import { fetchContacts } from '@/lib/api/contacts';
import { Groupe, getGroupes } from '@/lib/api/groupes';

interface ContactInfo {
  number: string;
  countryCode: string;
  fullNumber: string;
}

type ContactSelection = string | ContactInfo;

interface GroupContactsSelectorProps {
  onSelectContacts: (contacts: ContactSelection[]) => void;
  selectedContacts: string[];
}

export default function GroupContactsSelector({ onSelectContacts, selectedContacts }: GroupContactsSelectorProps) {
  const [groups, setGroups] = useState<Groupe[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupContacts, setGroupContacts] = useState<Record<string, Array<{contactNumber: string, contactName: string}>>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const user = getUserFromCookies();
        if (!user?.id) return;
        
        setClientId(user.id);
        const groupsData = await getGroupes(user.id);
        setGroups(groupsData);
      } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  const loadGroupContacts = async (groupId: string) => {
    try {
      if (groupContacts[groupId]) {
        setExpandedGroup(expandedGroup === groupId ? null : groupId);
        return;
      }

      const token = getTokenFromCookies();
      if (!token) return;

      const contacts = await fetchContacts({ groupId });
      setGroupContacts(prev => ({
        ...prev,
        [groupId]: contacts
      }));
      setExpandedGroup(groupId);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts du groupe:', error);
    }
  };

  const toggleContactSelection = (contactNumber: string, contactName: string = '') => {
    // Nettoyer le numéro
    const cleanedNumber = contactNumber.replace(/\D/g, '');
    
    // Extraire l'indicatif pays (241 pour le Gabon)
    let number = cleanedNumber;
    let countryCode = 'GA'; // Par défaut
    
    if (cleanedNumber.startsWith('241') && cleanedNumber.length > 3) {
      // Numéro gabonais avec indicatif
      countryCode = 'GA';
      number = cleanedNumber.substring(3); // Enlever l'indicatif
    } else if (cleanedNumber.startsWith('33') && cleanedNumber.length > 2) {
      // Numéro français avec indicatif
      countryCode = 'FR';
      number = cleanedNumber.substring(2); // Enlever l'indicatif
    } else if (cleanedNumber.match(/^[0-9]{9}$/)) {
      // Numéro sans indicatif (9 chiffres) - on considère que c'est un numéro gabonais
      countryCode = 'GA';
      number = cleanedNumber;
    }
    
    const fullNumber = countryCode === 'GA' 
      ? `241${number}` 
      : countryCode === 'FR' 
        ? `33${number}` 
        : number;
        
    // Créer l'objet contact avec toutes les informations
    const contactInfo = {
      number,
      countryCode,
      fullNumber,
      contactName: contactName || `Contact ${number}`
    };
    
    // Vérifier si le contact est déjà sélectionné
    const isSelected = selectedContacts.includes(fullNumber);
    
    if (isSelected) {
      // Retirer le contact de la sélection
      onSelectContacts(selectedContacts.filter(num => num !== fullNumber));
    } else {
      // Ajouter le contact à la sélection
      onSelectContacts([...selectedContacts, fullNumber]);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    if (!groupContacts[groupId]) return;
    
    const allGroupNumbers = groupContacts[groupId].map(c => {
      // Même logique de formatage que pour les contacts individuels
      const cleanedNumber = c.contactNumber.replace(/\D/g, '');
      let number = cleanedNumber;
      let countryCode = 'GA';
      
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
      
      return countryCode === 'GA' 
        ? `241${number}` 
        : countryCode === 'FR' 
          ? `33${number}` 
          : number;
    });
    
    const allSelected = allGroupNumbers.every(num => 
      selectedContacts.includes(num)
    );
    
    if (allSelected) {
      // Désélectionner tous les contacts du groupe
      onSelectContacts(
        selectedContacts.filter(num => !allGroupNumbers.includes(num))
      );
    } else {
      // Sélectionner tous les contacts du groupe
      const newSelections = [...new Set([...selectedContacts, ...allGroupNumbers])];
      onSelectContacts(newSelections);
    }
  };

  // Filtrer les groupes en fonction de la recherche
  const filteredGroups = groups.filter(group => 
    group.nomGroupe.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Gérer le changement de recherche
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value) {
      setIsSearching(true);
      // Simuler un délai pour le chargement
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Sélectionner un groupe</CardTitle>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un groupe..."
            className="pl-8"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {searchQuery ? 'Aucun groupe trouvé' : 'Aucun groupe disponible'}
          </p>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.idClientsGroups} className="border rounded-md overflow-hidden">
              <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => loadGroupContacts(group.idClientsGroups)}>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{group.nomGroupe}</span>
                </div>
                {expandedGroup === group.idClientsGroups ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
              
              {expandedGroup === group.idClientsGroups && (
                <div className="border-t bg-muted/20 p-2 space-y-1">
                  {groupContacts[group.idClientsGroups]?.length > 0 ? (
                    <>
                      <div className="flex justify-between items-center p-2">
                        <span className="text-sm">Tous les contacts</span>
                        <button
                          className="text-sm text-primary hover:no-underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupSelection(group.idClientsGroups);
                          }}
                        >
                          {groupContacts[group.idClientsGroups].every(contact => 
                            selectedContacts.includes(contact.contactNumber)
                          ) ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      </div>
                      {groupContacts[group.idClientsGroups].map((contact) => (
                        <div 
                          key={contact.contactNumber}
                          className={`flex items-center p-2 rounded cursor-pointer group ${
                            selectedContacts.includes(contact.contactNumber)
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
                              <User className={`h-4 w-4 ${
                                selectedContacts.includes(contact.contactNumber)
                                  ? 'text-blue-600'
                                  : 'text-muted-foreground'
                              }`} />
                              {selectedContacts.includes(contact.contactNumber) && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="h-2 w-2 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className={`text-sm ${
                                selectedContacts.includes(contact.contactNumber)
                                  ? 'font-medium text-blue-800'
                                  : 'text-gray-900'
                              }`}>
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
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                      Aucun contact dans ce groupe
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
