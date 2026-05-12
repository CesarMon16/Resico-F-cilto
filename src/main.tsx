import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
<<<<<<< HEAD
=======
import { attachOnlineListener, flushQueue } from "@/lib/offlineQueue";

attachOnlineListener();
// Intento de flush al arrancar (por si quedaron pendientes de sesión previa)
if (typeof navigator !== "undefined" && navigator.onLine) {
  void flushQueue();
}
>>>>>>> Facilito_alpha

createRoot(document.getElementById("root")!).render(<App />);
