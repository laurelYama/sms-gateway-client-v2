'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Clock, History } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type MessageType = 'simple' | 'groupe' | 'programme' | 'historique';

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<MessageType>('simple');

  const messageTabs = [
    {
      value: 'simple',
      label: 'Message simple',
      icon: MessageSquare,
      content: (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="new-message">
              <AccordionTrigger>Nouveau message simple</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">Destinataire</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded" 
                      placeholder="Numéro de téléphone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea 
                      className="w-full p-2 border rounded min-h-[100px]" 
                      placeholder="Saisissez votre message ici..."
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Caractères restants: 160
                    </p>
                  </div>
                  <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors">
                    Envoyer
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Messages récents</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">+33 6 12 34 56 78</p>
                      <p className="text-sm text-muted-foreground">Aujourd'hui à 14:3{i}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Envoyé
                    </span>
                  </div>
                  <p className="mt-2">Message de test {i}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      value: 'groupe',
      label: 'Message groupé',
      icon: Users,
      content: (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="group-message">
              <AccordionTrigger>Nouveau message groupé</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">Groupe de contacts</label>
                    <select className="w-full p-2 border rounded">
                      <option>Sélectionner un groupe</option>
                      <option>Clients VIP</option>
                      <option>Équipe commerciale</option>
                      <option>Fournisseurs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea 
                      className="w-full p-2 border rounded min-h-[100px]" 
                      placeholder="Saisissez votre message ici..."
                    />
                  </div>
                  <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors">
                    Envoyer au groupe
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Groupes de contacts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['Clients VIP', 'Équipe commerciale', 'Fournisseurs'].map((group, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{group}</CardTitle>
                    <p className="text-sm text-muted-foreground">{15 + i * 3} contacts</p>
                  </CardHeader>
                  <CardContent>
                    <button className="text-sm text-primary hover:underline">
                      Envoyer un message
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      value: 'programme',
      label: 'Message programmé',
      icon: Clock,
      content: (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="scheduled-message">
              <AccordionTrigger>Nouveau message programmé</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date d'envoi</label>
                      <input 
                        type="datetime-local" 
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Destinataire(s)</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded" 
                        placeholder="Numéros séparés par des virgules"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea 
                      className="w-full p-2 border rounded min-h-[100px]" 
                      placeholder="Saisissez votre message ici..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors">
                      Programmer l'envoi
                    </button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Messages programmés</h3>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium">Rappel de paiement</p>
                    <p className="text-sm text-muted-foreground">
                      Programmé pour le {new Date(Date.now() + i * 86400000).toLocaleDateString()} à 09:00
                    </p>
                    <p className="text-sm mt-1">Destinataires: {3 * i} contacts</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-sm text-primary hover:underline">Modifier</button>
                    <button className="text-sm text-destructive hover:underline">Annuler</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      value: 'historique',
      label: 'Historique',
      icon: History,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Historique des messages</h3>
            <div className="flex space-x-2">
              <select className="p-2 border rounded text-sm">
                <option>Tous les types</option>
                <option>Message simple</option>
                <option>Message groupé</option>
                <option>Message programmé</option>
              </select>
              <input 
                type="date" 
                className="p-2 border rounded text-sm"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 p-3 text-sm font-medium text-gray-500">
              <div className="col-span-3">Date et heure</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Destinataire(s)</div>
              <div className="col-span-3">Message</div>
              <div className="col-span-1 text-right">Statut</div>
            </div>
            
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-12 p-3 border-t text-sm items-center">
                <div className="col-span-3">
                  {new Date(Date.now() - i * 3600000).toLocaleString()}
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {i % 2 === 0 ? 'Simple' : 'Groupe'}
                  </span>
                </div>
                <div className="col-span-3 truncate">
                  {i % 2 === 0 ? '+33 6 12 34 56 78' : `Groupe (${i * 3} contacts)`}
                </div>
                <div className="col-span-3 truncate">
                  Message de test {i} {i % 2 === 0 ? '' : 'envoyé à un groupe de contacts'}
                </div>
                <div className="col-span-1 text-right">
                  <span className={`px-2 py-1 text-xs rounded ${
                    i % 3 === 0 ? 'bg-green-100 text-green-800' : 
                    i % 3 === 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {i % 3 === 0 ? 'Envoyé' : i % 3 === 1 ? 'En cours' : 'Échec'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center pt-4">
            <p className="text-sm text-muted-foreground">
              Affichage de 1 à 5 sur 23 messages
            </p>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border rounded text-sm">Précédent</button>
              <button className="px-3 py-1 border rounded bg-primary text-white text-sm">1</button>
              <button className="px-3 py-1 border rounded text-sm">2</button>
              <button className="px-3 py-1 border rounded text-sm">3</button>
              <button className="px-3 py-1 border rounded text-sm">Suivant</button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des messages</h2>
        <p className="text-muted-foreground">
          Envoyez et gérez vos SMS simples, groupés ou programmés
        </p>
      </div>

      <Tabs 
        defaultValue="simple" 
        className="w-full"
        onValueChange={(value) => setActiveTab(value as MessageType)}
      >
        <TabsList className="grid w-full grid-cols-4">
          {messageTabs.map((tab) => (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value}
              className="flex items-center space-x-2"
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        <div className="mt-6">
          {messageTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
