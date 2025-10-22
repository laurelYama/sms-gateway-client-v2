'use client';

import { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronRight, User, Check } from 'lucide-react';
import { fetchContacts } from '@/lib/api/contacts';
import { toast } from 'sonner';

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
        toast.error('Erreur lors du chargement des groupes');
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, []);

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
      toast.error('Erreur lors du chargement des contacts du groupe');
    }
  };

  // Sélectionner un contact (toujours remplacer le contact actuel)
  const toggleContactSelection = (contactNumber: string, contactName: string = '') => {
    // Créer un objet contact avec le numéro exactement comme il est
    const contactInfo: ContactInfo = {
      number: contactNumber,
      countryCode: '',
      fullNumber: contactNumber,
      contactName: contactName || undefined
    };
    
    // Toujours sélectionner le nouveau contact (remplace l'ancien s'il y en a un)
    onSelectContacts([contactInfo]);
  };

  // Gérer la sélection du groupe (sélectionne le premier contact du groupe)
  const toggleGroupSelection = (groupId: string) => {
    const groupContactsList = groupContacts[groupId] || [];
    
    // Si on clique sur le groupe, on sélectionne le premier contact
    if (groupContactsList.length > 0) {
      const firstContact = groupContactsList[0];
      
      // Sélectionner le premier contact du groupe (remplace toute sélection existante)
      onSelectContacts([{
        number: firstContact.contactNumber,
        countryCode: '',
        fullNumber: firstContact.contactNumber,
        contactName: firstContact.contactName
      }]);
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
                            : selected.number === contact.contactNumber
                        )
                      ) ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>
                  {groupContacts[group.id].map((contact) => {
                    const isSelected = selectedContacts.some(selected => 
                      typeof selected === 'string' 
                        ? selected === contact.contactNumber 
                        : selected.number === contact.contactNumber
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
