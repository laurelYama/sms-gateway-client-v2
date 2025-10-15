import { CreditHistory } from '@/components/credits/credit-history';

export default function CreditsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Historique des crédits</h2>
        <p className="text-muted-foreground">
          Consultez l'historique de vos demandes de crédits
        </p>
      </div>
      
      <CreditHistory />
    </div>
  );
}
