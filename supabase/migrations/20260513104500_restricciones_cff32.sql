-- FASE 1: MUTACIÓN DE ESQUEMA Y TRIGGERS DE INMUTABILIDAD (POSTGRESQL)
-- Protocolo de Restricción Fiscal CFF-32 v1.0

-- 1. Modificación de la tabla calculos_fiscales para soportar control de versiones (CFF Art. 32)
ALTER TABLE public.calculos_fiscales 
ADD COLUMN tipo_declaracion VARCHAR CHECK (tipo_declaracion IN ('normal', 'complementaria')) DEFAULT 'normal',
ADD COLUMN version INTEGER CHECK (version >= 1 AND version <= 4) DEFAULT 1;

-- 2. Garantizar unicidad referencial por negocio, periodo y versión
ALTER TABLE public.calculos_fiscales
ADD CONSTRAINT unique_negocio_periodo_version UNIQUE(negocio_id, periodo, version);

-- 3. Función de Trigger para inyectar inmutabilidad en transacciones vinculadas
CREATE OR REPLACE FUNCTION public.check_transaccion_bloqueada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_periodo_old TEXT;
    v_periodo_new TEXT;
    v_count_old INTEGER := 0;
    v_count_new INTEGER := 0;
BEGIN
    -- Bloqueo para ELIMINACIONES
    IF (TG_OP = 'DELETE') THEN
        v_periodo_old := to_char(OLD.fecha, 'YYYY-MM');
        
        SELECT COUNT(*) INTO v_count_old 
        FROM public.calculos_fiscales 
        WHERE negocio_id = OLD.negocio_id AND periodo = v_periodo_old;
        
        IF (v_count_old > 0) THEN
            RAISE EXCEPTION 'ERR_CFF_LOCKED: Transacción vinculada a declaración emitida (Periodo: %)', v_periodo_old;
        END IF;
        RETURN OLD;
    END IF;

    -- Bloqueo para ACTUALIZACIONES
    IF (TG_OP = 'UPDATE') THEN
        v_periodo_old := to_char(OLD.fecha, 'YYYY-MM');
        v_periodo_new := to_char(NEW.fecha, 'YYYY-MM');

        -- Verificar si el origen estaba bloqueado
        SELECT COUNT(*) INTO v_count_old 
        FROM public.calculos_fiscales 
        WHERE negocio_id = OLD.negocio_id AND periodo = v_periodo_old;

        IF (v_count_old > 0) THEN
            RAISE EXCEPTION 'ERR_CFF_LOCKED: No se puede modificar una transacción de un periodo cerrado (Periodo: %)', v_periodo_old;
        END IF;

        -- Verificar si el destino está bloqueado (evitar inyecciones en periodos cerrados)
        IF (v_periodo_old <> v_periodo_new) THEN
            SELECT COUNT(*) INTO v_count_new 
            FROM public.calculos_fiscales 
            WHERE negocio_id = NEW.negocio_id AND periodo = v_periodo_new;

            IF (v_count_new > 0) THEN
                RAISE EXCEPTION 'ERR_CFF_LOCKED: No se puede mover una transacción a un periodo ya declarado (Periodo: %)', v_periodo_new;
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Activación de la barrera de inmutabilidad
DROP TRIGGER IF EXISTS trg_check_transaccion_inmutable ON public.transacciones;
CREATE TRIGGER trg_check_transaccion_inmutable
BEFORE UPDATE OR DELETE ON public.transacciones
FOR EACH ROW EXECUTE FUNCTION public.check_transaccion_bloqueada();

-- Documentación de metadatos fiscales
COMMENT ON COLUMN public.calculos_fiscales.tipo_declaracion IS 'Tipo de declaración según CFF Art. 32 (normal o complementaria)';
COMMENT ON COLUMN public.calculos_fiscales.version IS 'Control de versión temporal (1 Normal + hasta 3 Complementarias)';
