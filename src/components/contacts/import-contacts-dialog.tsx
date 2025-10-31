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
import { importContactsCSV, importContactsXLSX } from '@/lib/api/contacts';
import { getGroupes } from '@/lib/api/groupes';
import { getClientId } from '@/lib/utils/clientUtils';

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
        const clientId = getClientId();
        if (!clientId) {
          console.error('ClientId non trouvé lors du chargement des groupes');
          toast.error('No se pudieron recuperar los grupos: cliente no identificado');
          return;
        }

        const groupes = await getGroupes(clientId);
        const mapped = groupes.map(g => ({ id: g.idClientsGroups, name: g.nomGroupe || 'Sans nom' }));
        setGroups(mapped);
        if (mapped.length > 0) setSelectedGroupId(mapped[0].id);
      } catch (error) {
        console.error('Error al cargar los grupos:', error);
        toast.error('Error al cargar los grupos');
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
      toast.error('Por favor seleccione un archivo');
      return;
    }

    if (!selectedGroupId) {
      console.error('Aucun groupe sélectionné');
      toast.error('Por favor seleccione un grupo');
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
        const errorMsg = 'Formato de archivo no soportado. Utilice un archivo .csv o .xlsx';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      toast.success('Contactos importados con éxito');
      if (onSuccess) {
        console.log('Appel de onSuccess');
        onSuccess();
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de l\'import des contacts:', error);
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error durante la importación');
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
          <DialogTitle>Importar contactos</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Grupo de destino</Label>
              <Select 
                value={selectedGroupId} 
                onValueChange={setSelectedGroupId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar un grupo" />
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
              <Label htmlFor="file">Archivo a importar</Label>
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
                  {fileName || 'Seleccionar archivo'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos soportados: .csv, .xlsx
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-medium mb-2">Formato de archivo esperado:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                <span>CSV: nombre,número</span>
              </div>
              <div className="flex items-center">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                <span>XLSX: Columnas "name" y "number"</span>
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
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!file || loading}
              className="min-w-24"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : 'Importar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
