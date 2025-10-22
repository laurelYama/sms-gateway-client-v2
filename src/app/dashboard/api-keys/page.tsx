'use client';

import { useState, useEffect } from 'react';
import type { ApiKeyData } from '@/lib/api/apiKeys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, RefreshCw, Check, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { fetchApiKey, regenerateApiKey } from '@/lib/api/apiKeys';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ApiKeysPage() {
  const [apiKeyData, setApiKeyData] = useState<ApiKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
          title: 'Erreur',
          description: 'Impossible de charger la clé API',
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
        title: 'Succès',
        description: 'Nouvelle clé API générée avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de la régénération de la clé API:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de régénérer la clé API',
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
        title: 'Copié !',
        description: 'La clé API a été copiée dans le presse-papier',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie dans le presse-papier:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de copier la clé dans le presse-papier. Veuillez copier manuellement.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion des clés API</h1>
        <p className="text-muted-foreground">
          Gérez votre clé API pour accéder aux fonctionnalités avancées
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Votre clé API</CardTitle>
          <CardDescription>
            Utilisez cette clé pour vous authentifier auprès de notre API. Gardez-la secrète et ne la partagez pas.
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
                  onClick={handleRegenerateKey}
                  disabled={regenerating || !apiKeyData}
                >
                  {regenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Régénération...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Régénérer la clé
                    </>
                  )}
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
                    <h3 className="font-medium">Important</h3>
                    <div className="mt-2">
                      <p>La régénération de votre clé API invalidera immédiatement l'ancienne clé. Assurez-vous de mettre à jour toutes vos applications utilisant cette clé.</p>
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
          <CardTitle>Documentation de l'API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <p>Pour utiliser l'API, incluez l'en-tête d'autorisation suivant dans vos requêtes :</p>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto">
              <code>Authorization: Bearer {apiKeyData?.apiKey || 'VOTRE_CLE_API'}</code>
            </pre>
            <div className="mt-4 space-y-2">
              <p>Consultez la documentation complète de l'API pour plus d'informations sur les points de terminaison disponibles.</p>
              <a
                href="https://api-smsgateway.solutech-one.com/api/V1/documents/download/f58a58af-be16-42f7-992e-88ac18f8757a_Documentation_SMS_Gateway.pdf"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Télécharger la documentation complète (PDF)
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogue de confirmation de régénération */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Confirmer la régénération</span>
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir générer une nouvelle clé API ?
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md text-yellow-800 dark:text-yellow-200 text-sm">
            <p>Cette action est irréversible. L'ancienne clé API sera immédiatement invalidée.</p>
            <p className="mt-2">Assurez-vous de mettre à jour toutes vos applications utilisant cette clé.</p>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={cancelRegenerate} disabled={regenerating}>
              Annuler
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
                'Générer une nouvelle clé'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
