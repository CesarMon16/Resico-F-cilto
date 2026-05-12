import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { attachOnlineListener, flushQueue } from "@/lib/offlineQueue";

attachOnlineListener();
// Intento de flush al arrancar (por si quedaron pendientes de sesión previa)
if (typeof navigator !== "undefined" && navigator.onLine) {
  void flushQueue();
}

createRoot(document.getElementById("root")!).render(<App />);
