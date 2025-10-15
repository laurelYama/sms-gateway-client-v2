'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { importContactsCSV, importContactsXLSX, fetchContacts } from '@/lib/api/contacts';

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onSuccess?: () => void;
}

export function ImportContactsDialog({ 
  open, 
  onOpenChange,
  groupId,
  onSuccess 
}: ImportContactsDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groups, setGroups] = useState<Array<{id: string, name: string}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les groupes disponibles
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const contacts = await fetchContacts({});
        // Extraire les groupes uniques des contacts
        const uniqueGroups = Array.from(
          new Map(
            contacts
              .filter(contact => contact.clientsGroup?.idClientsGroups)
              .map(contact => [
                contact.clientsGroup!.idClientsGroups,
                {
                  id: contact.clientsGroup!.idClientsGroups,
                  name: contact.clientsGroup!.nomGroupe || 'Sans nom'
                }
              ])
          ).values()
        );
        setGroups(uniqueGroups);
      } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
        toast.error('Erreur lors du chargement des groupes');
      }
    };

    if (open) {
      loadGroups();
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!file) {
      console.error('Aucun fichier sélectionné');
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    if (!selectedGroupId) {
      console.error('Aucun groupe sélectionné');
      toast.error('Veuillez sélectionner un groupe');
      return;
    }

    console.log('Tentative d\'importation du fichier:', file.name);
    console.log('Groupe ID:', groupId);

    setLoading(true);

    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      console.log('Type de fichier détecté:', isCSV ? 'CSV' : 'XLSX');
      
      if (isCSV) {
        console.log('Appel de importContactsCSV...');
        const result = await importContactsCSV(selectedGroupId, file);
        console.log('Résultat de importContactsCSV:', result);
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        console.log('Appel de importContactsXLSX...');
        const result = await importContactsXLSX(selectedGroupId, file);
        console.log('Résultat de importContactsXLSX:', result);
      } else {
        const errorMsg = 'Format de fichier non supporté. Utilisez un fichier .csv ou .xlsx';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      toast.success('Contacts importés avec succès');
      if (onSuccess) {
        console.log('Appel de onSuccess');
        onSuccess();
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de l\'import des contacts:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importer des contacts</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Groupe de destination</Label>
              <Select 
                value={selectedGroupId} 
                onValueChange={setSelectedGroupId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un groupe" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Fichier à importer</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleButtonClick}
                  className="w-full justify-start"
                  disabled={loading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {fileName || 'Sélectionner un fichier'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formats supportés: .csv, .xlsx
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-medium mb-2">Format du fichier attendu :</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                <span>CSV : name,number</span>
              </div>
              <div className="flex items-center">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                <span>XLSX : Colonnes "name" et "number"</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={!file || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
