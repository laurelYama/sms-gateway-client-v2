import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Chemin vers le fichier PDF dans le dossier public
    const filePath = path.join(process.cwd(), 'public', 'Documentation-SMS-Gateway.pdf');
    
    // Lire le fichier
    const file = await fs.readFile(filePath);
    
    // Retourner le fichier avec les en-têtes appropriés
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename=Documentation_SMS_Gateway.pdf',
        'Content-Length': file.length.toString(),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier PDF:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de la lecture du fichier PDF' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
