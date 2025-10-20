"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  eachDayOfInterval,
  format,
  parseISO,
} from "date-fns";
import {
  MessageSquare,
  Users,
  UsersRound,
  Send,
  CheckCircle,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTokenFromCookies, getUserFromCookies } from "@/lib/auth";
import { API_ENDPOINTS } from "@/config/api";
import { SmsDailyChart } from "@/components/dashboard/SmsDailyChart";

// Fonction pour décoder le payload JWT
const decodeJwtPayload = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Erreur lors du décodage du token:", e);
    return null;
  }
};

export default function DashboardPage() {
  const router = useRouter();

  // États
  const [smsCount, setSmsCount] = useState<number | null>(null);
  const [loadingSms, setLoadingSms] = useState<boolean>(false);
  const [groupCount, setGroupCount] = useState<number | null>(null);
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [soldeNet, setSoldeNet] = useState<number | null>(null);
  const [ordersApproved, setOrdersApproved] = useState<number | null>(null);
  const [consumption, setConsumption] = useState<number | null>(null);
  const [period, setPeriod] = useState<"today" | "7d" | "month">("month");

  // Simulation de récupération du client ID
  const resolveClientId = (): string | undefined => {
    const token = Cookies.get("authToken");
    if (token) {
      const payload = decodeJwtPayload(token);
      return payload?.id || payload?.sub;
    }
    const user = Cookies.get("user");
    if (user) {
      const parsed = JSON.parse(user);
      return parsed?.id;
    }
    return undefined;
  };

  // Exemple de récupération des données (ici, simplifiée)
  useEffect(() => {
    const token = getTokenFromCookies();
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setLoadingSms(true);
      // Simulation des données
      setTimeout(() => {
        setSmsCount(1234);
        setGroupCount(5);
        setContactCount(250);
        setSoldeNet(78500);
        setOrdersApproved(3);
        setConsumption(654);
        setLoadingSms(false);
      }, 1000);
    };

    fetchData();
  }, [router]);

  // Données factices pour le graphique
  const dailySmsData = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const days = eachDayOfInterval({ start, end: now });
    return days.map((d) => ({
      date: format(d, "d MMM"),
      "Message simple": Math.floor(Math.random() * 20),
      "Message groupé": Math.floor(Math.random() * 10),
      "Message programmé": Math.floor(Math.random() * 5),
    }));
  }, []);

  // Statistiques du haut
  const stats = [
    {
      title: "SMS envoyés ce mois",
      value: loadingSms ? "..." : smsCount ?? "0",
      icon: Send,
    },
    {
      title: "Groupes",
      value: loadingSms ? "..." : groupCount ?? "0",
      icon: Users,
    },
    {
      title: "Contacts",
      value: loadingSms ? "..." : contactCount ?? "0",
      icon: UsersRound,
    },
    {
      title: "Solde net (FCFA)",
      value: loadingSms ? "..." : soldeNet?.toLocaleString() ?? "0",
      icon: CreditCard,
    },
  ];

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Bienvenue sur votre tableau de bord
          </h2>
          <p className="text-muted-foreground">
            Gérez vos messages, contacts et campagnes SMS en un seul endroit.
          </p>
        </div>

        {/* Statistiques principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
          ))}
        </div>

        {/* SMS envoyés par période */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <CardTitle>SMS envoyés par période</CardTitle>
            <div className="flex gap-2">
              <Button
                  size="sm"
                  variant={period === "today" ? "default" : "outline"}
                  onClick={() => setPeriod("today")}
              >
                Aujourd&apos;hui
              </Button>
              <Button
                  size="sm"
                  variant={period === "7d" ? "default" : "outline"}
                  onClick={() => setPeriod("7d")}
              >
                7 jours
              </Button>
              <Button
                  size="sm"
                  variant={period === "month" ? "default" : "outline"}
                  onClick={() => setPeriod("month")}
              >
                Mois
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <SmsDailyChart data={dailySmsData} />
          </CardContent>
        </Card>

        {/* Section consommation */}
        <Card>
          <CardHeader>
            <CardTitle>Consommation totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingSms ? "..." : `${consumption ?? 0} SMS`}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Total consommé ce mois-ci.
            </p>
          </CardContent>
        </Card>

        {/* Section commandes approuvées */}
        <Card>
          <CardHeader>
            <CardTitle>Commandes approuvées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-2xl font-semibold">
              {loadingSms ? "..." : ordersApproved ?? 0}
            </span>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
