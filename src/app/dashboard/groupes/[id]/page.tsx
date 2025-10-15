'use client';

import { useParams, useRouter } from 'next/navigation';
import { GroupeForm } from '@/components/groupes/groupe-form';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Upload, MoreVertical, Pencil, Trash2, Move, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { fetchContacts, createContact, updateContact, deleteContact, moveContact, importContactsFromCSV, type Contact } from '@/lib/api/contacts';
import { toast } from 'sonner';

export default function GroupeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState({ name: '', number: '' });
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!params.id) {
      router.push('/dashboard/groupes');
      return;
    }
    loadContacts();
  }, [params.id, router]);

  const loadContacts = async () => {
    try {
      console.log('Chargement des contacts pour le groupe ID:', params.id);
      setLoading(true);
      const data = await fetchContacts({ groupId: params.id });
      console.log('Données des contacts reçues:', data);
      setContacts(data);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      toast.error('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.number) return;
    
    try {
      setIsAddingContact(true);
      await createContact({
        contactName: newContact.name,
        contactNumber: newContact.number,
        groupId: params.id
      });
      
      setNewContact({ name: '', number: '' });
      await loadContacts();
      toast.success('Contact ajouté avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contact:', error);
      toast.error('Erreur lors de l\'ajout du contact');
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;
    
    try {
      await deleteContact(contactId);
      await loadContacts();
      toast.success('Contact supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du contact:', error);
      toast.error('Erreur lors de la suppression du contact');
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    try {
      setIsImporting(true);
      await importContactsFromCSV(params.id, selectedFile);
      await loadContacts();
      toast.success('Contacts importés avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'importation des contacts:', error);
      toast.error('Erreur lors de l\'importation des contacts');
    } finally {
      setIsImporting(false);
      // Réinitialiser l'input file
      e.target.value = '';
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
        <h1 className="text-2xl font-bold">Gestion du groupe</h1>
        <GroupeForm groupeId={params.id} onSuccess={() => router.push('/dashboard/groupes')} />
      </div>
      
      <div className="grid gap-6">
        {/* Formulaire d'ajout de contact */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Ajouter un contact</h2>
          <form onSubmit={handleAddContact} className="flex gap-2">
            <Input
              type="text"
              placeholder="Nom du contact"
              value={newContact.name}
              onChange={(e) => setNewContact({...newContact, name: e.target.value})}
              required
            />
            <Input
              type="tel"
              placeholder="Numéro de téléphone"
              value={newContact.number}
              onChange={(e) => setNewContact({...newContact, number: e.target.value})}
              required
            />
            <Button type="submit" disabled={isAddingContact}>
              {isAddingContact ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Ajouter
            </Button>
          </form>
          
          <div className="mt-4">
            <input
              type="file"
              id="csv-import"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
              disabled={isImporting}
            />
            <label
              htmlFor="csv-import"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importer depuis CSV
            </label>
          </div>
        </div>

        {/* Liste des contacts */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Contacts du groupe</h2>
            <p className="text-sm text-gray-500">{contacts.length} contact(s) au total</p>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Numéro</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length > 0 ? (
                  contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>{contact.contactName}</TableCell>
                      <TableCell>{contact.contactNumber}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Modifier</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Move className="mr-2 h-4 w-4" />
                              <span>Déplacer</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => contact.id && handleDeleteContact(contact.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Supprimer</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      Aucun contact dans ce groupe
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
