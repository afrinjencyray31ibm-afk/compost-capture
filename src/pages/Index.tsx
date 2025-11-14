import { useState } from "react";
import { Leaf } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WasteScanner } from "@/components/WasteScanner";
import { WasteHistory } from "@/components/WasteHistory";

const Index = () => {
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const handleScanComplete = () => {
    setHistoryRefresh((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 mb-2">
            <Leaf className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Waste Segregation Scanner
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            AI-powered waste classification to help you dispose responsibly
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="scan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan">Scan Waste</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-4">
            <WasteScanner onScanComplete={handleScanComplete} />
          </TabsContent>

          <TabsContent value="history">
            <WasteHistory refresh={historyRefresh} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            🌱 Help reduce environmental impact through proper waste disposal
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;