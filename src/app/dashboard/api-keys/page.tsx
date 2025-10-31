'use client';

import { useState, useEffect } from 'react';
import type { ApiKeyData } from '@/lib/api/apiKeys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, RefreshCw, Check, Loader2, AlertTriangle, Key, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { fetchApiKey, regenerateApiKey } from '@/lib/api/apiKeys';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ApiKeysPage() {
  const [apiKeyData, setApiKeyData] = useState<ApiKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDownloadPDF = () => {
    // Créer un lien temporaire pour le téléchargement
    const link = document.createElement('a');
    link.href = '/Documentation API SMS Gateway.pdf';
    link.download = 'Documentation-API-SMS-Gateway.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Charger la clé API au montage du composant
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        setLoading(true);
        const data = await fetchApiKey();
        setApiKeyData(data);
      } catch (error) {
        console.error('Erreur lors du chargement de la clé API:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la clave API',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadApiKey();
  }, []);

  const handleRegenerateKey = () => {
    setShowConfirmDialog(true);
  };

  const confirmRegenerate = async () => {
    setShowConfirmDialog(false);
    
    try {
      setRegenerating(true);
      const data = await regenerateApiKey();
      setApiKeyData(data);
      toast({
        title: 'Éxito',
        description: 'Nueva clave API generada con éxito',
      });
    } catch (error) {
      console.error('Erreur lors de la régénération de la clé API:', error);
      toast({
        title: 'Error',
        description: 'No se pudo regenerar la clave API',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
    }
  };

  const cancelRegenerate = () => {
    setShowConfirmDialog(false);
  };

  const copyToClipboard = () => {
    if (!apiKeyData?.apiKey) return;
    try {
      navigator.clipboard.writeText(apiKeyData.apiKey);
      setCopied(true);
      toast({
        title: '¡Copiado!',
        description: 'La clave API se ha copiado al portapapeles',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie dans le presse-papier:', err);
      toast({
        title: 'Error',
        description: 'No se pudo copiar la clave al portapapeles. Por favor, cópiela manualmente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API de envío de SMS</h1>
        <p className="text-muted-foreground">
          Si desea enviar SMS desde su sistema de información.
          Solo tiene que integrar nuestras API cuyas URL son:
          <br />
          <br /><span className="text-primary">https://api.sms-gateway.com/api/V1/sms/unides</span>
          <br /><span className="text-primary">https://api.sms-gateway.com/api/V1/sms/muldes</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Su clave API
          </CardTitle>
          <CardDescription>
            Use esta clave para autenticarse ante nuestra API. Guárdela en secreto y no la comparta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-stretch gap-2">
                  <div className="flex-1">
                    <Input
                      readOnly
                      value={apiKeyData?.apiKey || 'Aucune clé API trouvée'}
                      className="font-mono h-10"
                    />
                    {apiKeyData?.expiresAt && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Expire le {new Date(apiKeyData.expiresAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={copyToClipboard}
                    disabled={!apiKeyData?.apiKey}
                    className="h-[40px] w-10 flex-shrink-0"
                    title="Copier la clé"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateKey}
                  disabled={regenerating}
                  className="gap-2"
                >
                  {regenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Regenerar la clave
                </Button>
              </div>

              <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium">Importante</h3>
                    <div className="mt-2">
                      <p>La regeneración de su clave API invalidará inmediatamente la clave anterior. Asegúrese de actualizar todas sus aplicaciones que utilicen esta clave.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentación de la API</CardTitle>
          <CardDescription>
            "Para usar la API, incluya el siguiente encabezado de autorización en sus solicitudes:"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-md font-mono text-sm overflow-x-auto">
            <code>Authorization: Bearer SU_CLAVE_API</code>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Consulte la documentación completa de la API para más información sobre los puntos finales disponibles.
          </p>
          <Button 
            className="mt-4" 
            variant="outline"
            onClick={handleDownloadPDF}
          >
            <FileText className="mr-2 h-4 w-4" />
            Descargar la documentación completa (PDF)
          </Button>
        </CardContent>
      </Card>

      {/* Dialogue de confirmation de régénération */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Importante
            </DialogTitle>
            <DialogDescription className="pt-2">
              La regeneración de su clave API invalidará inmediatamente la clave anterior. Asegúrese de actualizar todas sus aplicaciones que utilicen esta clave.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={cancelRegenerate}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  En cours...
                </>
              ) : (
                'Regenerar clave'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
