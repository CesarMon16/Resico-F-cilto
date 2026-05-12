import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditoria";

export async function asignarContadorPorCorreo(clienteId: string, correo: string) {
  const email = correo.trim().toLowerCase();
  if (!email) throw new Error("Escribe el correo de tu contador");
  const { data: contadorId, error: lookupErr } = await supabase.rpc("buscar_contador_por_correo", { _email: email });
  if (lookupErr || !contadorId) throw new Error("No encontramos un contador con ese correo");
  const { error } = await supabase.from("contador_clientes").insert({
    contador_id: contadorId as string,
    cliente_id: clienteId,
    invitado_por: clienteId,
    estatus: "ACTIVO",
  });
  if (error) throw new Error("No se pudo asignar. ¿Ya lo tienes asignado?");
  void auditLog("CLIENTE_ASIGNADO", { contador_id: contadorId, correo: email });
  return contadorId as string;
}

export async function quitarAsignacion(asignacionId: string) {
  const { error } = await supabase.from("contador_clientes").delete().eq("id", asignacionId);
  if (error) throw new Error("No se pudo quitar el contador");
  void auditLog("CLIENTE_REMOVIDO", { asignacion_id: asignacionId });
}
