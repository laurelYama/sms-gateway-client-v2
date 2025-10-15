'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Upload, MoreVertical, Pencil, Trash2, Move, Search, Phone, User, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { EditContactDialog } from '@/components/contacts/edit-contact-dialog';
import { DeleteContactDialog } from '@/components/contacts/delete-contact-dialog';
import { ImportContactsDialog } from '@/components/contacts/import-contacts-dialog';
import { MoveContactDialog } from '@/components/contacts/move-contact-dialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fetchContacts, deleteContact, type Contact } from '@/lib/api/contacts';
import { AddContactDialog } from '@/components/contacts/add-contact-dialog';
import { toast } from 'sonner';

// Fonction pour formater les numéros de téléphone
function formatPhoneNumber(phoneNumber: string) {
  if (!phoneNumber) return 'N/A';
  
  // Si le numéro commence par un indicatif, on le met en évidence
  if (phoneNumber.startsWith('+')) {
    const code = phoneNumber.substring(0, 4); // +241
    const rest = phoneNumber.substring(4).replace(/(\d{2})(?=\d)/g, '$1 ');
    return (
      <>
        <span className="text-blue-600">{code}</span> {rest}
      </>
    );
  }
  
  // Pour les numéros sans indicatif, on formate par paires de 2 chiffres
  return phoneNumber.replace(/(\d{2})(?=\d)/g, '$1 ');
}

interface SelectedContact {
  id: string;
  contactName: string;
  contactNumber: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<{id: string; name: string} | null>(null);
  const [contactToMove, setContactToMove] = useState<{
    id: string;
    contactName: string;
    contactNumber: string;
    groupName?: string;
  } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState(''); // Pour stocker le groupe sélectionné pour l'import
  
  // État de pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  // Calcul des contacts à afficher
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredContacts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  
  // Fonctions de navigation
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    let result = [...contacts];
    
    // Filtrer par terme de recherche si fourni
    if (searchTerm) {
      result = result.filter(contact => 
        contact.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.contactNumber.includes(searchTerm)
      );
    }
    
    // Trier les contacts par nom (insensible à la casse)
    result.sort((a, b) => 
      a.contactName.localeCompare(b.contactName, undefined, {sensitivity: 'base'})
    );
    
    setFilteredContacts(result);
    // Réinitialiser à la première page lors d'une modification de la liste
    setCurrentPage(1);
  }, [searchTerm, contacts]);

  const handleMoveClick = (contact: Contact) => {
    setContactToMove({
      id: contact.idClientsContacts || '',
      contactName: contact.contactName,
      contactNumber: contact.contactNumber,
      groupName: contact.clientsGroup?.nomGroupe
    });
    setIsMoveDialogOpen(true);
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      console.log('Chargement des contacts...');
      const data = await fetchContacts({});
      console.log('Données des contacts reçues:', data);
      
      // Vérifier la structure des données
      if (data.length > 0) {
        console.log('Premier contact:', data[0]);
        console.log('Groupe du premier contact:', data[0].clientsGroup);
      }
      
      setContacts(data);
      setFilteredContacts(data);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      toast.error('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact(contactId);
      await loadContacts();
    } catch (error) {
      console.error('Erreur lors de la suppression du contact:', error);
      throw error; // L'erreur est gérée dans le composant DeleteContactDialog
    }
  };
  
  const handleConfirmDelete = async (contactId: string) => {
    if (!contactId) return;
    try {
      await deleteContact(contactId);
      await loadContacts();
      return Promise.resolve();
    } catch (error) {
      console.error('Erreur lors de la suppression du contact:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Chargement des contacts...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des contacts</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un contact..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
            <AddContactDialog 
              groupId="" // Vous devrez peut-être passer un groupId ici si nécessaire
              onSuccess={loadContacts}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    <span>Nom</span>
                  </div>
                </TableHead>
                <TableHead className="w-1/4">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>Téléphone</span>
                  </div>
                </TableHead>
                <TableHead className="w-1/4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Groupe</span>
                  </div>
                </TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length > 0 ? (
                currentItems.map((contact) => {
                  // Créer un identifiant unique pour chaque contact
                  const uniqueKey = contact.id || `contact-${contact.contactNumber}-${contact.contactName}`;
                  return (
                    <TableRow key={uniqueKey} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                            {contact.contactName ? contact.contactName.charAt(0).toUpperCase() : '?'}
                          </span>
                          <span>{contact.contactName || 'Sans nom'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="font-mono">{formatPhoneNumber(contact.contactNumber)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {contact.clientsGroup ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {contact.clientsGroup.nomGroupe || 'Aucun groupe'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Aucun groupe</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                if (contact.idClientsContacts) {
                                  setSelectedContact({
                                    id: contact.idClientsContacts,
                                    contactName: contact.contactName,
                                    contactNumber: contact.contactNumber
                                  });
                                  setIsEditDialogOpen(true);
                                }
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Modifier</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleMoveClick(contact)}
                            >
                              <Move className="mr-2 h-4 w-4" />
                              <span>Déplacer</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={(e) => {
                                e.preventDefault();
                                if (contact.idClientsContacts) {
                                  setContactToDelete({
                                    id: contact.idClientsContacts,
                                    name: contact.contactName
                                  });
                                  setIsDeleteDialogOpen(true);
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Supprimer</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )})
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'Aucun contact trouvé' : 'Aucun contact pour le moment'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {filteredContacts.length > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Affichage de {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredContacts.length)} sur {filteredContacts.length} contact(s)
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium">Lignes par page</span>
                  <select
                    className="h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {[5, 10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center px-2 text-sm">
                    Page {currentPage} sur {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <EditContactDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        contact={selectedContact}
        onSuccess={loadContacts}
      />
      
      <DeleteContactDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        contactId={contactToDelete?.id || ''}
        contactName={contactToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
      />
      
      <MoveContactDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        contact={contactToMove || { id: '', contactName: '', contactNumber: '' }}
        onSuccess={loadContacts}
      />
      
      <ImportContactsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        groupId={selectedGroupId}
        onSuccess={loadContacts}
      />
    </div>
  );
}
