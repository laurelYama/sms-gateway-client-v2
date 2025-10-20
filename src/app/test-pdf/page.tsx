"use client";

import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';

export default function TestPdfPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Test de téléchargement PDF</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Méthode 1: Lien direct</h2>
          <a 
            href="/Documentation-SMS-Gateway.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Ouvrir le PDF dans un nouvel onglet
          </a>
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Méthode 2: Téléchargement direct</h2>
          <a 
            href="/Documentation-SMS-Gateway.pdf" 
            download="Documentation_SMS_Gateway.pdf"
            className="text-blue-600 hover:underline"
          >
            Télécharger le PDF directement
          </a>
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Méthode 3: Via fetch</h2>
          <Button
            onClick={async () => {
              try {
                const response = await fetch('/Documentation-SMS-Gateway.pdf');
                if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Documentation_SMS_Gateway.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Erreur:', error);
                const message = error instanceof Error ? error.message : String(error);
                alert(`Erreur lors du téléchargement: ${message}`);
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger via fetch
          </Button>
        </div>
      </div>
    </div>
  );
}
