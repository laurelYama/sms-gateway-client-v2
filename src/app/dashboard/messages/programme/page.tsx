'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Send, Calendar, Clock, RefreshCw, User, MessageSquare, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { fetchContacts } from '@/lib/api/contacts';
import { fetchEmetteurs } from '@/lib/api/emetteurs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';

export default function ScheduledMessagePage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
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
  const { toast } = useToast();
  const router = useRouter();
  
  // Charger les émetteurs et les contacts au montage du composant
  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger les émetteurs
        const emetteursData = await fetchEmetteurs();
        setEmetteurs(emetteursData);
        if (emetteursData.length > 0) {
          setSelectedEmetteur(emetteursData[0].nom);
        }
        
        // Charger les contacts
        const contactsData = await fetchContacts('');
        setContacts(contactsData);
        setFilteredContacts(contactsData);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données nécessaires',
          variant: 'destructive',
        });
      }
    };
    
    loadData();
  }, [toast]);

  // Filtrer les contacts en fonction de la recherche
  useEffect(() => {
    if (!searchQuery) {
      setFilteredContacts(contacts);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact => 
      contact.contactName?.toLowerCase().includes(query) || 
      contact.contactNumber?.includes(query)
    );
    
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

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
        toast({
          title: 'Session expirée',
          description: 'Veuillez vous reconnecter',
          variant: 'destructive',
        });
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
      
      const response = await fetch(API_ENDPOINTS.SMS_PROGRAMMES, {
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
      
      toast({
        title: 'Succès',
        description: `Message programmé pour ${selectedContacts.length} destinataire(s)`,
        variant: 'default',
      });
      
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
          
          {/* Carte de sélection des contacts */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div>
                  <CardTitle className="text-lg">Contacts</CardTitle>
                  <p className="text-sm text-muted-foreground">Sélectionnez les destinataires</p>
                </div>
              </CardHeader>
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Rechercher un contact..."
                      className="w-full pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 px-2 py-2">
                    <Button
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const allVisibleSelected = filteredContacts.every(contact => 
                          selectedContacts.includes(contact.contactNumber)
                        );
                        
                        if (allVisibleSelected) {
                          // Si tout est déjà sélectionné, on décoche tout
                          setSelectedContacts(prev => 
                            prev.filter(num => 
                              !filteredContacts.some(contact => contact.contactNumber === num)
                            )
                          );
                        } else {
                          // Sinon on coche tout ce qui est visible
                          const newSelected = new Set(selectedContacts);
                          filteredContacts.forEach(contact => {
                            newSelected.add(contact.contactNumber);
                          });
                          setSelectedContacts(Array.from(newSelected));
                        }
                      }}
                      className="whitespace-nowrap text-xs h-7"
                    >
                      {filteredContacts.length > 0 && filteredContacts.every(contact => 
                        selectedContacts.includes(contact.contactNumber)
                      ) ? 'Tout décocher' : 'Tout cocher'}
                    </Button>
                    {selectedContacts.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 whitespace-nowrap"
                        onClick={() => setSelectedContacts(prev => [])}
                      >
                        Tout effacer
                      </Button>
                    )}
                  </div>
                </div>
                
                {filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                    <User className="h-8 w-8 mb-2 text-muted-foreground/50" />
                    <p>{searchQuery ? 'Aucun contact trouvé' : 'Aucun contact disponible'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-[calc(100vh-450px)] overflow-y-auto rounded-md border">
                      <ul className="divide-y">
                        {filteredContacts.map((contact) => (
                          <li key={contact.contactNumber} className="group">
                            <button
                              type="button"
                              onClick={() => handleContactToggle(contact.contactNumber)}
                              className={`w-full text-left p-3 hover:bg-accent/50 transition-colors ${
                                selectedContacts.includes(contact.contactNumber) ? 'bg-accent/30' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-foreground">
                                    {contact.contactName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {contact.contactNumber}
                                  </div>
                                </div>
                                {selectedContacts.includes(contact.contactNumber) && (
                                  <div className="text-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex justify-between items-center px-2 py-1.5 text-xs text-muted-foreground border-t bg-muted/20">
                      <span>
                        {filteredContacts.length} contact{filteredContacts.length > 1 ? 's' : ''} trouvé{filteredContacts.length > 1 ? 's' : ''}
                      </span>
                      <span>
                        {selectedContacts.length} sélectionné{selectedContacts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
