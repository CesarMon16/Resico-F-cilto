import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Zap, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface CameraOverlayProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraOverlay({ onCapture, onClose }: CameraOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(false);

  const startCamera = useCallback(async () => {
    setLoading(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      toast.error("No pudimos acceder a tu cámara. Verifica los permisos.");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Animación de flash
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Ajustar tamaño del canvas al video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `ticket-${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file);
        }
      }, "image/jpeg", 0.9);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between animate-in fade-in duration-300">
      {/* Header */}
      <div className="w-full p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/60 to-transparent z-10">
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 backdrop-blur-md">
          <X className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2 font-bold text-sm bg-primary/20 text-primary-foreground px-3 py-1 rounded-full border border-primary/30">
          <Sparkles className="h-4 w-4" /> Escáner de Tickets
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <RefreshCw className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium animate-pulse">Iniciando cámara...</p>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`h-full w-full object-cover transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}
        />
        
        {/* Guía de encuadre */}
        {!loading && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="w-full aspect-[3/4] max-w-sm border-2 border-white/50 rounded-3xl relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
              
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-white/10" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-white/10" />
              
              <p className="absolute -bottom-10 inset-x-0 text-center text-white/70 text-xs font-medium">
                Centra el ticket dentro del cuadro
              </p>
            </div>
          </div>
        )}

        {/* Flash Effect */}
        {flash && <div className="absolute inset-0 bg-white z-20 animate-out fade-out duration-150" />}
      </div>

      {/* Controls */}
      <div className="w-full p-8 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent z-10">
        <button 
          onClick={takePhoto}
          disabled={loading}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 group active:scale-90 transition-all disabled:opacity-50"
        >
          <div className="w-full h-full bg-white rounded-full group-hover:scale-95 transition-transform" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
