import React, { useRef, useCallback, useState, useEffect } from "react";
import { Camera, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CameraOverlayProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        setStream(newStream);
        setIsReady(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("No se pudo acceder a la cámara. Revisa los permisos.");
      onClose();
    }
  }, [onClose, stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `ticket_${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file);
        }
      }, "image/jpeg", 0.8);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      {/* Marco de guía */}
      <div className="absolute inset-0 border-[2px] border-white/30 m-12 rounded-xl pointer-events-none flex items-center justify-center">
        <div className="w-full h-1/3 border-y border-white/20"></div>
      </div>

      {/* Controles */}
      <div className="absolute bottom-10 inset-x-0 flex items-center justify-around px-10">
        <button
          onClick={onClose}
          className="p-4 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20"
        >
          <X className="h-6 w-6" />
        </button>

        <button
          onClick={takePhoto}
          disabled={!isReady}
          className="p-6 rounded-full bg-white text-black shadow-2xl active:scale-90 transition-transform disabled:opacity-50"
        >
          <Camera className="h-8 w-8" />
        </button>

        <button
          onClick={startCamera}
          className="p-4 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20"
        >
          <RefreshCw className="h-6 w-6" />
        </button>
      </div>

      <div className="absolute top-10 text-white font-bold text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
        Enfoca tu ticket dentro del cuadro
      </div>
    </div>
  );
};
