import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, Package, Wrench, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Classification {
  id: string;
  waste_type: string;
  confidence: number;
  created_at: string;
}

const wasteIcons = {
  biodegradable: Leaf,
  plastic: Package,
  metal: Wrench,
};

const wasteColors = {
  biodegradable: "bg-biodegradable-light text-biodegradable border-biodegradable",
  plastic: "bg-plastic-light text-plastic border-plastic",
  metal: "bg-metal-light text-metal border-metal",
};

export const WasteHistory = ({ refresh }: { refresh: number }) => {
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [stats, setStats] = useState({ biodegradable: 0, plastic: 0, metal: 0 });

  useEffect(() => {
    fetchHistory();
  }, [refresh]);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("waste_classifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching history:", error);
      return;
    }

    setClassifications(data || []);

    // Calculate stats
    const newStats = { biodegradable: 0, plastic: 0, metal: 0 };
    data?.forEach((item) => {
      if (item.waste_type in newStats) {
        newStats[item.waste_type as keyof typeof newStats]++;
      }
    });
    setStats(newStats);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(stats).map(([type, count]) => {
          const Icon = wasteIcons[type as keyof typeof wasteIcons];
          return (
            <Card key={type} className={`p-4 ${wasteColors[type as keyof typeof wasteColors]} border-2`}>
              <div className="flex items-center gap-3">
                <Icon className="h-8 w-8" />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs capitalize">{type}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Classifications</h3>
        <div className="space-y-3">
          {classifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No classifications yet. Start scanning!
            </p>
          ) : (
            classifications.map((item) => {
              const Icon = wasteIcons[item.waste_type as keyof typeof wasteIcons];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${wasteColors[item.waste_type as keyof typeof wasteColors]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{item.waste_type}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {Math.round(item.confidence * 100)}%
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};