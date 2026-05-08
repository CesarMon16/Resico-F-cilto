import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiMock } from "@/lib/mockData";

interface UseTransactionRegistrationProps {
  isIngreso: boolean;
}

export function useTransactionRegistration({ isIngreso }: UseTransactionRegistrationProps) {
  const navigate = useNavigate();
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict numeric validation and > 0.01 requirement
    const valor = Number(monto);
    if (isNaN(valor) || valor <= 0.01) {
      toast.error("El monto debe ser numérico y mayor a 0.01");
      return;
    }

    if (!fecha) {
      toast.error("Selecciona una fecha válida");
      return;
    }

    setBusy(true);
    
    // Use API Mock adapter
    const { success, error } = await apiMock.saveTransaction({
      tipo: isIngreso ? "ingreso" : "gasto",
      monto: valor,
      fecha,
      descripcion,
    });

    setBusy(false);

    if (!success) {
      toast.error(error || "No se pudo guardar. Intenta otra vez");
      return;
    }

    toast.success(
      isIngreso
        ? `¡Listo! Registraste una venta de $${valor.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `¡Listo! Registraste un gasto de $${valor.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
    navigate("/");
  };

  return {
    monto, setMonto,
    descripcion, setDescripcion,
    fecha, setFecha,
    busy,
    handleSubmit
  };
}
