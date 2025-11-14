import { useState, useRef } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScanResult {
  wasteType: string;
  confidence: number;
  reasoning: string;
  disposalInstructions: string[];
}

export const WasteScanner = ({ onScanComplete }: { onScanComplete: () => void }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processImage(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Could not access camera");
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob) {
          await processImage(blob as File);
          stopCamera();
        }
      }, "image/jpeg");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const processImage = async (file: File | Blob) => {
    setIsScanning(true);
    setScanResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setImagePreview(base64Data);

      try {
        const { data, error } = await supabase.functions.invoke("classify-waste", {
          body: { imageData: base64Data }
        });

        if (error) throw error;

        setScanResult(data);

        // Save to database
        const { error: dbError } = await supabase
          .from("waste_classifications")
          .insert({
            waste_type: data.wasteType,
            confidence: data.confidence,
            image_url: base64Data.substring(0, 200) // Store a portion for reference
          });

        if (dbError) {
          console.error("Database error:", dbError);
        } else {
          onScanComplete();
        }

        toast.success(`Classified as ${data.wasteType}`);
      } catch (error) {
        console.error("Classification error:", error);
        toast.error("Failed to classify waste. Please try again.");
      } finally {
        setIsScanning(false);
      }
    };

    reader.readAsDataURL(file);
  };

  if (isCameraActive) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg"
          />
          <div className="flex gap-2">
            <Button onClick={captureImage} className="flex-1">
              <Camera className="mr-2 h-4 w-4" />
              Capture
            </Button>
            <Button onClick={stopCamera} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-8 text-center space-y-6 border-2 border-dashed hover:border-primary transition-colors">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Scan Your Waste</h3>
            <p className="text-muted-foreground">
              Take a photo or upload an image to classify your waste
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={startCamera} size="lg" className="gap-2">
            <Camera className="h-5 w-5" />
            Use Camera
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Upload className="h-5 w-5" />
            Upload Image
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </Card>

      {isScanning && (
        <Card className="p-6">
          <div className="flex items-center justify-center gap-3 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="font-medium">Analyzing waste...</span>
          </div>
        </Card>
      )}

      {imagePreview && scanResult && (
        <Card className="p-6 space-y-4">
          <img
            src={imagePreview}
            alt="Scanned waste"
            className="w-full rounded-lg max-h-64 object-cover"
          />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Classification Result</h3>
              <span className="text-sm text-muted-foreground">
                {Math.round(scanResult.confidence * 100)}% confident
              </span>
            </div>

            <div className={`p-4 rounded-lg bg-${scanResult.wasteType}-light border-2 border-${scanResult.wasteType}`}>
              <p className="text-lg font-bold capitalize text-foreground">
                {scanResult.wasteType}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {scanResult.reasoning}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Disposal Instructions:</h4>
              <ul className="space-y-1.5">
                {scanResult.disposalInstructions.map((instruction, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span className="text-muted-foreground">{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Button
            onClick={() => {
              setScanResult(null);
              setImagePreview(null);
            }}
            variant="outline"
            className="w-full"
          >
            Scan Another Item
          </Button>
        </Card>
      )}
    </div>
  );
};