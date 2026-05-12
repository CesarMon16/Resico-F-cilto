/**
 * Cola simple offline para registrar transacciones cuando no hay internet.
 * Persiste en localStorage. Cuando vuelve la conexión, hace flush al servidor.
 */
import { supabase } from "@/integrations/supabase/client";

const KEY = "offline.tx.queue.v1";

export interface PendingTx {
  usuario_id: string;
  negocio_id: string;
  tipo: "INGRESO" | "GASTO";
  monto: number;
  descripcion: string | null;
  con_factura?: boolean;
  fecha?: string;
  origen?: string;
  _ts: number;
}

function read(): PendingTx[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(items: PendingTx[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueueTx(tx: Omit<PendingTx, "_ts">) {
  const items = read();
  items.push({ ...tx, _ts: Date.now() });
  write(items);
}

export function pendingCount(): number {
  return read().length;
}

export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  if (!navigator.onLine) return { ok: 0, fail: 0 };
  const items = read();
  if (items.length === 0) return { ok: 0, fail: 0 };
  let ok = 0;
  const remaining: PendingTx[] = [];
  for (const it of items) {
    const { _ts, ...row } = it;
    const { error } = await supabase.from("transacciones").insert(row);
    if (error) remaining.push(it);
    else ok++;
  }
  write(remaining);
  return { ok, fail: remaining.length };
}

export function attachOnlineListener() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    void flushQueue();
  });
}
