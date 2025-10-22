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
    // Créer l'objet contact avec le numéro exact et le nom
    const contactInfo = {
      number: contactNumber,
      countryCode: '',
      fullNumber: contactNumber,
      contactName: contactName || ''
    };
    
    // Vérifier si le même contact est déjà sélectionné
    const existingContactIndex = selectedContacts.findIndex(contact => 
      typeof contact === 'string' 
        ? contact === contactNumber 
        : contact.number === contactNumber
    );
    
    if (existingContactIndex !== -1) {
      // Désélectionner ce contact spécifique
      onSelectContacts(selectedContacts.filter((_, index) => index !== existingContactIndex));
    } else {
      // Ajouter le nouveau contact à la sélection existante
      onSelectContacts([...selectedContacts, contactInfo]);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    if (!groupContacts[groupId]) return;
    
    // Créer des objets ContactInfo pour tous les contacts du groupe
    const groupContactInfos = groupContacts[groupId].map(contact => ({
      number: contact.contactNumber,
      countryCode: '',
      fullNumber: contact.contactNumber,
      contactName: contact.contactName || ''
    }));
    
    // Vérifier si tous les contacts du groupe sont déjà sélectionnés
    const allSelected = groupContactInfos.every(contactInfo => 
      selectedContacts.some(selected => 
        typeof selected === 'string' 
          ? selected === contactInfo.number 
          : selected.number === contactInfo.number
      )
    );
    
    if (allSelected) {
      // Désélectionner tous les contacts du groupe
      onSelectContacts(
        selectedContacts.filter(selected => 
          !groupContactInfos.some(contactInfo => 
            typeof selected === 'string'
              ? selected === contactInfo.number
              : selected.number === contactInfo.number
          )
        )
      );
    } else {
      // Ajouter les contacts du groupe à la sélection existante
      const newSelections = [...selectedContacts];
      
      groupContactInfos.forEach(contactInfo => {
        const exists = newSelections.some(selected => 
          typeof selected === 'string'
            ? selected === contactInfo.number
            : selected.number === contactInfo.number
        );
        
        if (!exists) {
          newSelections.push(contactInfo);
        }
      });
      
      onSelectContacts(newSelections);
    }
  };

  // Sélectionner ou désélectionner tous les contacts visibles
  const selectAllVisibleContacts = () => {
    // Si tout est déjà sélectionné, on désélectionne tout
    if (allVisibleSelected) {
      const visibleContactNumbers = new Set<string>();
      
      // Récupérer tous les numéros de contacts visibles
      filteredGroups.forEach(group => {
        const groupContactsList = groupContacts[group.idClientsGroups] || [];
        groupContactsList.forEach(contact => {
          visibleContactNumbers.add(contact.contactNumber);
        });
      });
      
      // Filtrer pour ne garder que les contacts non visibles
      const newSelections = selectedContacts.filter(contact => {
        const number = typeof contact === 'string' ? contact : contact.number;
        return !visibleContactNumbers.has(number);
      });
      
      onSelectContacts(newSelections);
    } else {
      // Sinon, on ajoute tous les contacts visibles
      const newSelections = [...selectedContacts];
      
      filteredGroups.forEach(group => {
        const groupContactsList = groupContacts[group.idClientsGroups] || [];
        groupContactsList.forEach(contact => {
          const exists = newSelections.some(selected => 
            typeof selected === 'string'
              ? selected === contact.contactNumber
              : selected.number === contact.contactNumber
          );
          
          if (!exists) {
            newSelections.push({
              number: contact.contactNumber,
              countryCode: '',
              fullNumber: contact.contactNumber,
              contactName: contact.contactName || ''
            });
          }
        });
      });
      
      onSelectContacts(newSelections);
    }
  };

  // Filtrer les groupes en fonction de la recherche
  const filteredGroups = groups.filter(group => 
    group.nomGroupe.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Vérifier si tous les contacts visibles sont sélectionnés
  const allVisibleSelected = filteredGroups.length > 0 && filteredGroups.every(group => {
    const groupContactsList = groupContacts[group.idClientsGroups] || [];
    return groupContactsList.length > 0 && groupContactsList.every(contact => 
      selectedContacts.some(selected =>
        typeof selected === 'string'
          ? selected === contact.contactNumber
          : selected.number === contact.contactNumber
      )
    );
  });

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
      <CardHeader className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">Sélectionner un groupe</h3>
            {filteredGroups.length > 0 && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={selectAllVisibleContacts}
                className="h-7 px-2 text-xs"
              >
                {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
            )}
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
                      <div className="p-2">
                        <span className="text-sm font-medium">Contacts du groupe</span>
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
