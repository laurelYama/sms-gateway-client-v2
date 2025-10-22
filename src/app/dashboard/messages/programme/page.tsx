'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertCircle, Send, Calendar, Clock, RefreshCw, User, MessageSquare, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import GroupContactsSelector from '@/components/messages/group-contacts-selector';
import { fetchContacts } from '@/lib/api/contacts';
import { fetchEmetteurs } from '@/lib/api/emetteurs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';
import { API_ENDPOINTS } from '@/config/api';

export default function ScheduledMessagePage() {
  const [contacts, setContacts] = useState<Array<{contactNumber: string, contactName: string}>>([]);
  const [filteredContacts, setFilteredContacts] = useState<Array<{contactNumber: string, contactName: string}>>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [emetteurs, setEmetteurs] = useState<Array<{id: string, nom: string}>>([]);
  const [selectedEmetteur, setSelectedEmetteur] = useState('');
  const [dateDebut, setDateDebut] = useState<Date | undefined>(new Date());
  const [dateFin, setDateFin] = useState<Date | undefined>(new Date());
  const [nbParJour, setNbParJour] = useState(1);
  const [intervalleMinutes, setIntervalleMinutes] = useState(0);
  const router = useRouter();
  
  // Gestion des erreurs
  const showError = (message: string) => {
    if (typeof window !== 'undefined') {
      toast.error(message);
    }
  };

  // Charger les émetteurs
  useEffect(() => {
    const loadEmetteurs = async () => {
      try {
        const emetteursData = await fetchEmetteurs();
        if (emetteursData && Array.isArray(emetteursData)) {
          setEmetteurs(emetteursData);
          if (emetteursData.length > 0) {
            setSelectedEmetteur(emetteursData[0].nom);
          }
        } else {
          throw new Error('Format de données invalide pour les émetteurs');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des émetteurs:', error);
        showError('Impossible de charger la liste des émetteurs');
      }
    };
    
    loadEmetteurs();
  }, []);

  // Mettre à jour les contacts filtrés lorsqu'ils changent
  useEffect(() => {
    setFilteredContacts(contacts);
  }, [contacts]);
  
  // Charger les contacts initiaux
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const user = getUserFromCookies();
        if (user?.id) {
          const contactsData = await fetchContacts({});
          if (contactsData && Array.isArray(contactsData)) {
            setContacts(contactsData);
          } else {
            throw new Error('Format de données invalide pour les contacts');
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des contacts:', error);
        showError('Impossible de charger la liste des contacts');
      }
    };
    
    loadContacts();
  }, []);

  const handleContactToggle = (contactNumber: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactNumber)
        ? prev.filter(num => num !== contactNumber)
        : [...prev, contactNumber]
    );
  
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedContacts.length === 0) {
      setError('Veuillez sélectionner au moins un destinataire');
      return;
    }
    
    if (!message.trim()) {
      setError('Veuillez saisir un message');
      return;
    }
    
    if (!dateDebut) {
      setError('Veuillez sélectionner une date de début');
      return;
    }
    
    if (!dateFin) {
      setError('Veuillez sélectionner une date de fin');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Récupérer le token depuis les cookies
      const token = getTokenFromCookies();
      if (!token) {
        toast.error('Session expirée');
        router.push('/login');
        return;
      }
      
      // Récupérer l'ID client depuis les données utilisateur
      const user = getUserFromCookies();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }
      
      const clientId = user.id;
      if (!clientId) {
        throw new Error('ID client non trouvé dans les informations utilisateur');
      }
      
      const emetteurSelectionne = emetteurs.find(e => e.nom === selectedEmetteur);
      if (!emetteurSelectionne) {
        throw new Error('Émetteur sélectionné introuvable');
      }
      
      // Formater les dates au format YYYY-MM-DD
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };
      
      const requestBody = {
        clientId,
        emetteur: emetteurSelectionne.nom,
        numeros: selectedContacts,
        corps: message,
        dateDebut: formatDate(dateDebut),
        nbParJour: Number(nbParJour),
        intervalleMinutes: Number(intervalleMinutes),
        dateFin: formatDate(dateFin)
      };
      
      console.log('Envoi de la requête avec le body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(API_ENDPOINTS.SMS.PROGRAMMES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include', // Inclure les cookies dans la requête
        body: JSON.stringify(requestBody)
      });
      
      console.log('Réponse reçue - Status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'envoi du message programmé');
      }
      
      const responseData = await response.json();
      
      toast.success(`Message programmé pour ${selectedContacts.length} destinataire(s)`);

      // Réinitialiser le formulaire
      setSelectedContacts([]);
      setMessage('');
      setDateDebut(new Date());
      setDateFin(new Date());
      setNbParJour(1);
      setIntervalleMinutes(0);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message programmé:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte d'envoi de message programmé */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div>
                  <CardTitle className="text-lg">Message programmé</CardTitle>
                  <p className="text-sm text-muted-foreground">Planifiez l'envoi de SMS à des dates et heures précises</p>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {/* Section Destinataires */}
                    <div>
                      <Label className="flex items-center gap-2 text-base font-medium mb-2">
                        <User className="h-4 w-4" />
                        Destinataires sélectionnés
                      </Label>
                      
                      {selectedContacts.length > 0 ? (
                        <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-md border">
                          {selectedContacts.map(phone => {
                            const contact = contacts.find(c => c.contactNumber === phone);
                            return (
                              <div 
                                key={phone} 
                                className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border text-sm"
                              >
                                <span>{contact?.contactName || phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleContactToggle(phone)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <span className="sr-only">Retirer</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-md border">
                          Aucun destinataire sélectionné. Sélectionnez des contacts dans la liste à droite.
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <Label className="text-sm font-medium">Émetteur</Label>
                        <Select
                          value={selectedEmetteur}
                          onValueChange={setSelectedEmetteur}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Sélectionnez un émetteur" />
                          </SelectTrigger>
                          <SelectContent>
                            {emetteurs.map((emetteur) => (
                              <SelectItem key={emetteur.id} value={emetteur.nom}>
                                {emetteur.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Section Message */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="message" className="flex items-center gap-2 text-base font-medium">
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          {message.length}/160 caractères • {Math.ceil(message.length / 160)} message{message.length > 160 ? 's' : ''}
                        </span>
                      </div>
                      <Textarea
                        id="message"
                        placeholder="Saisissez votre message ici..."
                        className="min-h-[120px]"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                    
                    {/* Section Programmation */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 text-base font-medium">
                        <Clock className="h-4 w-4" />
                        <span>Programmation</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date de début */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Date de début</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-10"
                              >
                                <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {dateDebut ? format(dateDebut, 'PPP', { locale: fr }) : 'Choisir une date'}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <div className="p-2">
                                <CalendarComponent
                                  mode="single"
                                  selected={dateDebut}
                                  onSelect={setDateDebut}
                                  initialFocus
                                  locale={fr}
                                  className="border-0"
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        {/* Date de fin */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Date de fin</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-10"
                              >
                                <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {dateFin ? format(dateFin, 'PPP', { locale: fr }) : 'Choisir une date'}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <div className="p-2">
                                <CalendarComponent
                                  mode="single"
                                  selected={dateFin}
                                  onSelect={setDateFin}
                                  initialFocus
                                  locale={fr}
                                  className="border-0"
                                  disabled={date => dateDebut ? date < dateDebut : false}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre d'envois par jour */}
                        <div className="space-y-2">
                          <Label htmlFor="nbParJour">Nombre d'envois par jour</Label>
                          <Input
                            id="nbParJour"
                            type="number"
                            min="1"
                            value={nbParJour}
                            onChange={(e) => setNbParJour(Number(e.target.value))}
                          />
                        </div>
                        
                        {/* Intervalle en minutes */}
                        <div className="space-y-2">
                          <Label htmlFor="intervalleMinutes">Intervalle entre les envois (minutes)</Label>
                          <Input
                            id="intervalleMinutes"
                            type="number"
                            min="0"
                            value={intervalleMinutes}
                            onChange={(e) => setIntervalleMinutes(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {error && (
                      <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        type="submit" 
                        className="gap-2"
                        disabled={isLoading || selectedContacts.length === 0 || !message}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Programmer l'envoi
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          
          {/* Carte de sélection des groupes */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Groupes de contacts</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">Sélectionnez un groupe pour voir les contacts</p>
                </div>
              </CardHeader>
              <div className="px-4 pb-4">
                <GroupContactsSelector 
                  selectedContacts={selectedContacts}
                  onSelectContacts={(contacts) => {
                    // Conversion des contacts en tableau de chaînes si nécessaire
                    const contactNumbers = contacts.map(contact => 
                      typeof contact === 'string' ? contact : contact.fullNumber
                    );
                    setSelectedContacts(contactNumbers);
                  }}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
