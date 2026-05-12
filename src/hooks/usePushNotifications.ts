import { useEffect, useState } from "react";
import { NotificationService } from "@/services/notification.service";
import { toast } from "sonner";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("Error checking push subscription:", err);
    } finally {
      setLoading(false);
    }
  }

  async function subscribe() {
    if (!("Notification" in window)) {
      toast.error("Tu navegador no soporta notificaciones");
      return;
    }

    try {
      setLoading(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast.error("Permiso de notificaciones denegado");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Suscribirse al servidor de push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
      });

      // Guardar en Supabase
      const service = new NotificationService();
      await service.guardarSuscripcion(subscription);
      
      setIsSubscribed(true);
      toast.success("¡Notificaciones activadas! 🔔");
    } catch (err) {
      console.error("Error al suscribirse a push:", err);
      toast.error("No se pudo activar las notificaciones");
    } finally {
      setLoading(false);
    }
  }

  return { permission, isSubscribed, loading, subscribe };
}

// Helper para convertir la llave VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
