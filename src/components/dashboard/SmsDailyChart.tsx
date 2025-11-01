'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, TooltipProps } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types pour les données SMS
type SmsUnides = {
  ref: string;
  type: 'UNIDES';
  destinataire: string;
  corps: string;
  emetteur: string;
  clientId: string;
  statut: string;
  createdAt: string;
  updatedAt: string;
};

type SmsGroupe = {
  ref: string;
  clientId: string;
  emetteur: string;
  corps: string;
  type: 'MULDES' | 'MULDESP';
  statut: string;
  createdAt: string;
  Destinataires: string[];
};

type SmsData = {
  date: string;
  unides: number;
  muldes: number;
  muldesp: number;
  formattedDate: string;
};

type SmsDailyChartProps = {
  unides: SmsUnides[];
  muldes: SmsGroupe[];
  muldesp: SmsGroupe[];
};

// Couleurs pour les différentes lignes
const COLORS = {
  unides: '#3b82f6',    // Bleu
  muldes: '#10b981',    // Vert
  muldesp: '#8b5cf6'    // Violet
};

// Composant personnalisé pour le tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg">
        <p className="font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`tooltip-${index}`} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value} envoi{entry.value > 1 ? 's' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function SmsDailyChart({ unides = [], muldes = [], muldesp = [] }: SmsDailyChartProps) {
  // Fonction pour regrouper les SMS par jour
  const groupSmsByDay = (smsList: any[], type: 'unides' | 'muldes' | 'muldesp') => {
    const grouped: Record<string, number> = {};
    
    smsList.forEach(sms => {
      const date = new Date(sms.createdAt);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = 0;
      }
      
      if (type === 'unides') {
        // Pour les UNIDES, on compte 1 par message envoyé
        if (sms.statut === 'ENVOYE') {
          grouped[dateKey] += 1;
        }
      } else {
        // Pour les MULDES et MULDEP, on compte le nombre de destinataires pour les messages envoyés
        if (sms.statut === 'ENVOYE') {
          const count = sms.Destinataires?.length || 1;
          grouped[dateKey] += count;
        }
      }
    });
    
    return grouped;
  };
  
  // Fusionner les données des trois types de messages (version sans useMemo)
  const getMergedData = () => {
    const unidesByDay = groupSmsByDay(unides, 'unides');
    const muldesByDay = groupSmsByDay(muldes, 'muldes');
    const muldespByDay = groupSmsByDay(muldesp, 'muldesp');
    
    // Récupérer toutes les dates uniques
    const allDates = new Set([
      ...Object.keys(unidesByDay),
      ...Object.keys(muldesByDay),
      ...Object.keys(muldespByDay)
    ]);
    
    // Créer un tableau avec toutes les dates
    return Array.from(allDates).map(date => ({
      date,
      unides: unidesByDay[date] || 0,
      muldes: muldesByDay[date] || 0,
      muldesp: muldespByDay[date] || 0,
      formattedDate: format(parseISO(date), 'd MMM', { locale: fr })
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  const mergedData = getMergedData();
  
  // Calculer les totaux (version sans useMemo)
  const getTotals = () => {
    const totals = {
      unides: unides.filter(sms => sms.statut === 'ENVOYE').length,
      muldes: muldes.reduce((sum, sms) => sms.statut === 'ENVOYE' ? sum + (sms.Destinataires?.length || 1) : sum, 0),
      muldesp: muldesp.reduce((sum, sms) => sms.statut === 'ENVOYE' ? sum + (sms.Destinataires?.length || 1) : sum, 0),
      get total() {
        return this.unides + this.muldes + this.muldesp;
      }
    };
    return totals;
  };
  
  const totals = getTotals();
  
  // Vérifier s'il y a des données à afficher
  const hasData = mergedData.length > 0 && (totals.unides > 0 || totals.muldes > 0 || totals.muldesp > 0);
  
  if (!hasData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Estadísticas de SMS</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-gray-500">
          No hay datos para mostrar en el período seleccionado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Actividad de SMS
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Gráfico</TabsTrigger>
            <TabsTrigger value="totals">Totales</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="mt-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={mergedData}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 12, fill: '#666' }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#666' }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                    tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : value)}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                  />
                  <Legend 
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => {
                      if (value === 'Simples') return <span className="text-xs text-gray-600">Simples</span>;
                      if (value === 'Grupales') return <span className="text-xs text-gray-600">Grupales</span>;
                      return <span className="text-xs text-gray-600">Programados</span>;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="unides"
                    name="Simples"
                    stroke={COLORS.unides}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: COLORS.unides }}
                  />
                  <Line
                    type="monotone"
                    dataKey="muldes"
                    name="Grupales"
                    stroke={COLORS.muldes}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: COLORS.muldes }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="muldesp"
                    name="Programados"
                    stroke={COLORS.muldesp}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: COLORS.muldesp }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="totals" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="text-sm font-medium text-blue-800">Mensajes Simples</div>
                  <div className="text-2xl font-bold text-blue-600">{totals.unides}</div>
                  <div className="text-xs text-blue-500 mt-1">UNIDES</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <div className="text-sm font-medium text-green-800">Mensajes Grupales</div>
                  <div className="text-2xl font-bold text-green-600">{totals.muldes}</div>
                  <div className="text-xs text-green-500 mt-1">MULDES</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <div className="text-sm font-medium text-purple-800">Mensajes Programados</div>
                  <div className="text-2xl font-bold text-purple-600">{totals.muldesp}</div>
                  <div className="text-xs text-purple-500 mt-1">MULDEP</div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="text-sm font-medium text-gray-700">Total de mensajes</div>
                <div className="text-3xl font-bold text-gray-900">
                  {totals.total}
                </div>
                <div className="text-xs text-gray-500 mt-1">Todos los tipos incluidos</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
