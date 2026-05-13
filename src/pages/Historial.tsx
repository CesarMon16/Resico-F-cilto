import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  Lock,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNegocio } from "@/hooks/useNegocio";
import { formatMXN } from "@/lib/fiscal";
import { handleError } from "@/lib/errors";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ─── Tipos ─────────────────────────────────────────────────────── */
interface Transaction {
  id: string;
  tipo: "INGRESO" | "GASTO";
  monto: number;
  descripcion: string;
  fecha: string;        // "YYYY-MM-DD"
  fechaDisplay: string; // formateada para mostrar
  esInmutable?: boolean;
}

const filters = ["Todos", "Ventas", "Gastos"] as const;

/* ─── Fila editable ─────────────────────────────────────────────── */
function FilaTx({
  tx,
  onSave,
  onDelete,
}: {
  tx: Transaction;
  onSave: (id: string, patch: Partial<Pick<Transaction, "monto" | "descripcion" | "fecha">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const isIngreso = tx.tipo === "INGRESO";
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(String(tx.monto));
  const [desc, setDesc] = useState(tx.descripcion);
  const [fecha, setFecha] = useState(tx.fecha);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const colorRing = isIngreso ? "focus:ring-green-400" : "focus:ring-rose-400";
  const colorText = isIngreso ? "text-green-600" : "text-rose-600";
  const colorBg = isIngreso
    ? "bg-green-50 dark:bg-green-900/10"
    : "bg-rose-50 dark:bg-rose-900/10";
  const colorBorder = isIngreso
    ? "border-green-200 dark:border-green-800"
    : "border-rose-200 dark:border-rose-800";

  const cancelar = () => {
    setMonto(String(tx.monto));
    setDesc(tx.descripcion);
    setFecha(tx.fecha);
    setEditando(false);
  };

  const validarCampos = (): string => {
    const n = parseFloat(monto.replace(/,/g, ""));
    if (!monto.trim()) return "El monto es obligatorio.";
    if (isNaN(n) || !isFinite(n)) return "Ingresa un número válido.";
    if (n <= 0) return "El monto debe ser mayor a $0.";
    if (n < 0.01) return "El monto mínimo es $0.01.";
    if (n > 3_500_000) return "Excede el límite anual RESICO ($3,500,000).";
    if (desc.length > 200) return "La descripción no puede superar 200 caracteres.";
    if (!fecha) return "La fecha es obligatoria.";
    const d = new Date(fecha + "T00:00:00");
    if (isNaN(d.getTime())) return "La fecha no es válida.";
    if (d > new Date()) return "La fecha no puede ser futura.";
    return "";
  };

  const iniciarGuardado = () => {
    const err = validarCampos();
    if (err) {
      toast.error(err);
      return;
    }
    setShowSaveConfirm(true);
  };

  const confirmarGuardado = async () => {
    const n = parseFloat(monto.replace(/,/g, ""));
    setSaving(true);
    try {
      await onSave(tx.id, { monto: n, descripcion: desc, fecha });
      setEditando(false);
    } finally {
      setSaving(false);
      setShowSaveConfirm(false);
    }
  };

  const ejecutarDelete = async () => {
    await onDelete(tx.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div
      className={`rounded-2xl border ${colorBorder} ${colorBg} p-4 transition-all ${tx.esInmutable ? "opacity-90 border-dashed" : ""}`}
    >
      {editando ? (
        /* ── Modo edición ── */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`rounded-full p-2 ${isIngreso ? "bg-green-100 dark:bg-green-900/40" : "bg-rose-100 dark:bg-rose-900/40"}`}
            >
              {isIngreso ? (
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowDownCircle className="h-5 w-5 text-rose-600" />
              )}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${colorText}`}>
              {isIngreso ? "Venta" : "Gasto"}
            </span>
          </div>

          <div className="space-y-2">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Descripción</span>
              <input
                type="text"
                maxLength={200}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className={`mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 ${
                  desc.length > 200
                    ? "border-destructive focus:ring-destructive/40"
                    : `border-input ${colorRing}`
                }`}
                placeholder={isIngreso ? "Ej: Pago de cliente" : "Ej: Material de oficina"}
              />
              <div className="flex justify-between mt-0.5">
                {desc.length > 200 && (
                  <p className="text-[10px] text-destructive font-semibold">⚠️ Máximo 200 caracteres</p>
                )}
                <p className={`text-[10px] ml-auto ${
                  desc.length > 180 ? "text-destructive font-semibold" : "text-muted-foreground"
                }`}>{desc.length}/200</p>
              </div>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">
                  Monto ($) <span className="text-destructive">*</span>
                </span>
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  max={3500000}
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className={`mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold outline-none focus:ring-2 ${
                    (() => {
                      const n = parseFloat(monto.replace(/,/g, ""));
                      return !monto || isNaN(n) || n <= 0 || n > 3_500_000
                        ? "border-destructive focus:ring-destructive/40"
                        : `border-input ${colorRing}`;
                    })()
                  }`}
                />
                {(() => {
                  const n = parseFloat(monto.replace(/,/g, ""));
                  if (!monto) return <p className="text-[10px] text-destructive font-semibold mt-0.5">⚠️ Obligatorio</p>;
                  if (isNaN(n) || !isFinite(n)) return <p className="text-[10px] text-destructive font-semibold mt-0.5">⚠️ Número inválido</p>;
                  if (n <= 0) return <p className="text-[10px] text-destructive font-semibold mt-0.5">⚠️ Debe ser &gt; $0</p>;
                  if (n > 3_500_000) return <p className="text-[10px] text-destructive font-semibold mt-0.5">⚠️ Excede límite RESICO</p>;
                  return <p className="text-[10px] text-muted-foreground mt-0.5">✅ ${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>;
                })()}
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">
                  Fecha <span className="text-destructive">*</span>
                </span>
                <input
                  type="date"
                  value={fecha}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setFecha(e.target.value)}
                  className={`mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ${
                    !fecha ? "border-destructive focus:ring-destructive/40" : `border-input ${colorRing}`
                  }`}
                />
                {!fecha && (
                  <p className="text-[10px] text-destructive font-semibold mt-0.5">⚠️ Obligatoria</p>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={iniciarGuardado}
              disabled={saving}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {saving ? (
                <span className="animate-pulse">Guardando…</span>
              ) : (
                <><Check className="h-4 w-4" /> Guardar</>
              )}
            </button>
            <button
              onClick={cancelar}
              className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-bold text-muted-foreground flex items-center justify-center gap-1.5"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        /* ── Modo lectura ── */
        <div className="flex items-center gap-3">
          <div
            className={`rounded-full p-2 ${isIngreso ? "bg-green-100 dark:bg-green-900/40" : "bg-rose-100 dark:bg-rose-900/40"} shrink-0`}
          >
            {isIngreso ? (
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowDownCircle className="h-5 w-5 text-rose-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {tx.descripcion || (isIngreso ? "Venta" : "Gasto")}
            </p>
            <p className="text-xs text-muted-foreground">{tx.fechaDisplay}</p>
          </div>

          <p className={`font-extrabold text-sm shrink-0 ${colorText}`}>
            {isIngreso ? "+" : "-"}{formatMXN(tx.monto)}
          </p>

          <div className="flex gap-1 shrink-0">
            {tx.esInmutable ? (
              <div className="p-2 text-muted-foreground/50" title="Registro inmutable (Periodo Declarado)">
                <Lock className="h-4 w-4" />
              </div>
            ) : (
              <>
                <button
                  onClick={() => setEditando(true)}
                  className="rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl p-2 hover:bg-destructive/10 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── AlertDialog: Confirmar Eliminación ── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              ¿Eliminar movimiento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se borrará permanentemente de tu historial fiscal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction onClick={ejecutarDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Confirmar Edición ── */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              ¿Guardar cambios?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que los nuevos datos (${Number(monto).toLocaleString("es-MX")}) son correctos? Esto actualizará tu historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar de nuevo</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarGuardado}>
              Sí, actualizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Página Historial ──────────────────────────────────────────── */
export default function Historial() {
  const { negocio } = useNegocio();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    if (!negocio) return;
    setLoading(true);
    (async () => {
      const [{ data: txs }, { data: calcs }] = await Promise.all([
        supabase
          .from("transacciones")
          .select("id, tipo, monto, descripcion, fecha")
          .eq("negocio_id", negocio.id)
          .order("fecha", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("calculos_fiscales")
          .select("periodo")
          .eq("negocio_id", negocio.id)
      ]);

      const periodosDeclarados = new Set((calcs ?? []).map(c => c.periodo));

      setItems(
        (txs ?? []).map((t: Tables<"transacciones">) => {
          const key = t.fecha.slice(0, 7);
          return {
            id: t.id,
            tipo: t.tipo as "INGRESO" | "GASTO",
            monto: Number(t.monto),
            descripcion: t.descripcion ?? "",
            fecha: t.fecha,
            esInmutable: periodosDeclarados.has(key),
            fechaDisplay: new Date(t.fecha + "T00:00:00").toLocaleDateString(
              "es-MX",
              { day: "numeric", month: "short", year: "numeric" }
            ),
          };
        })
      );
      setLoading(false);
    })();
  }, [negocio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSave = async (
    id: string,
    patch: Partial<Pick<Transaction, "monto" | "descripcion" | "fecha">>
  ) => {
    try {
      const { error } = await supabase
        .from("transacciones")
        .update({
          ...(patch.monto !== undefined && { monto: patch.monto }),
          ...(patch.descripcion !== undefined && { descripcion: patch.descripcion }),
          ...(patch.fecha !== undefined && { fecha: patch.fecha }),
        })
        .eq("id", id);
      if (error) throw error;
      setItems((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                ...patch,
                fechaDisplay: patch.fecha
                  ? new Date(patch.fecha + "T00:00:00").toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : t.fechaDisplay,
              }
            : t
        )
      );
      toast.success("✅ Cambio guardado");
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transacciones")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((t) => t.id !== id));
      toast.success("🗑️ Movimiento eliminado");
    } catch (err) {
      handleError(err);
    }
  };

  const filtered = items.filter((t) => {
    if (filter === "Ventas") return t.tipo === "INGRESO";
    if (filter === "Gastos") return t.tipo === "GASTO";
    return true;
  });

  /* totales del filtro activo */
  const totalVentas = filtered
    .filter((t) => t.tipo === "INGRESO")
    .reduce((s, t) => s + t.monto, 0);
  const totalGastos = filtered
    .filter((t) => t.tipo === "GASTO")
    .reduce((s, t) => s + t.monto, 0);

  return (
    <div className="px-4 pt-6 pb-32 space-y-5 animate-slide-up">
      <h1 className="text-2xl font-extrabold">📋 Tu historial</h1>

      {/* Filtros */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Mini resumen rápido */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400">
              {filter === "Todos" || filter === "Ventas" ? "Ventas" : "—"}
            </p>
            <p className="text-lg font-extrabold text-green-700 dark:text-green-400">
              {formatMXN(totalVentas)}
            </p>
          </div>
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3">
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              {filter === "Todos" || filter === "Gastos" ? "Gastos" : "—"}
            </p>
            <p className="text-lg font-extrabold text-rose-700 dark:text-rose-400">
              {formatMXN(totalGastos)}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground -mt-1">
        Toca el ✏️ para editar o el 🗑️ para eliminar cualquier movimiento.
      </p>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-8 animate-pulse">
            Cargando movimientos…
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Sin movimientos registrados todavía.
          </p>
        ) : (
          filtered.map((t) => (
            <FilaTx
              key={t.id}
              tx={t}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
