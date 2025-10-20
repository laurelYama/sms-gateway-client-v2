import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'Documentation-SMS-Gateway.pdf');
    
    // Lire le fichier en binaire de manière asynchrone
    const fileBuffer = await fs.readFile(filePath);
    
    // Créer la réponse avec le fichier
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Documentation_SMS_Gateway.pdf"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    return response;
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier PDF:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors du téléchargement du fichier' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
