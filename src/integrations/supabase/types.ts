export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          accion: string
          fecha: string
          id: string
          metadata: Json | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          fecha?: string
          id?: string
          metadata?: Json | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          fecha?: string
          id?: string
          metadata?: Json | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      calculos_fiscales: {
        Row: {
          fecha_calculo: string
          gastos: number
          id: string
          ingresos: number
          isr_estimado: number
          iva_estimado: number
          negocio_id: string
          periodo: string
          usuario_id: string
        }
        Insert: {
          fecha_calculo?: string
          gastos?: number
          id?: string
          ingresos?: number
          isr_estimado?: number
          iva_estimado?: number
          negocio_id: string
          periodo: string
          usuario_id: string
        }
        Update: {
          fecha_calculo?: string
          gastos?: number
          id?: string
          ingresos?: number
          isr_estimado?: number
          iva_estimado?: number
          negocio_id?: string
          periodo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculos_fiscales_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      creditos: {
        Row: {
          estatus: Database["public"]["Enums"]["estatus_credito"]
          fecha_solicitud: string
          id: string
          monto_solicitado: number
          usuario_id: string
        }
        Insert: {
          estatus?: Database["public"]["Enums"]["estatus_credito"]
          fecha_solicitud?: string
          id?: string
          monto_solicitado: number
          usuario_id: string
        }
        Update: {
          estatus?: Database["public"]["Enums"]["estatus_credito"]
          fecha_solicitud?: string
          id?: string
          monto_solicitado?: number
          usuario_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          fecha_subida: string
          id: string
          negocio_id: string
          tipo: string
          url: string
          usuario_id: string
        }
        Insert: {
          fecha_subida?: string
          id?: string
          negocio_id: string
          tipo: string
          url: string
          usuario_id: string
        }
        Update: {
          fecha_subida?: string
          id?: string
          negocio_id?: string
          tipo?: string
          url?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios: {
        Row: {
          created_at: string
          giro: string | null
          id: string
          nombre_negocio: string
          ubicacion: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          giro?: string | null
          id?: string
          nombre_negocio: string
          ubicacion?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          giro?: string | null
          id?: string
          nombre_negocio?: string
          ubicacion?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          actividad_economica: string | null
          correo: string | null
          created_at: string
          curp: string | null
          domicilio_fiscal: string | null
          fecha_inicio_operaciones: string | null
          fecha_registro: string
          id: string
          nombre: string
          regimen_fiscal: string | null
          rfc: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          actividad_economica?: string | null
          correo?: string | null
          created_at?: string
          curp?: string | null
          domicilio_fiscal?: string | null
          fecha_inicio_operaciones?: string | null
          fecha_registro?: string
          id: string
          nombre: string
          regimen_fiscal?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          actividad_economica?: string | null
          correo?: string | null
          created_at?: string
          curp?: string | null
          domicilio_fiscal?: string | null
          fecha_inicio_operaciones?: string | null
          fecha_registro?: string
          id?: string
          nombre?: string
          regimen_fiscal?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transacciones: {
        Row: {
          categoria: string | null
          con_factura: boolean
          contraparte: string | null
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
          metodo_pago: string | null
          monto: number
          negocio_id: string
          origen: string | null
          tipo: Database["public"]["Enums"]["tipo_transaccion"]
          usuario_id: string
        }
        Insert: {
          categoria?: string | null
          con_factura?: boolean
          contraparte?: string | null
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          metodo_pago?: string | null
          monto: number
          negocio_id: string
          origen?: string | null
          tipo: Database["public"]["Enums"]["tipo_transaccion"]
          usuario_id: string
        }
        Update: {
          categoria?: string | null
          con_factura?: boolean
          contraparte?: string | null
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          negocio_id?: string
          origen?: string | null
          tipo?: Database["public"]["Enums"]["tipo_transaccion"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transacciones_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "USUARIO" | "CONTADOR" | "ADMIN"
      estatus_credito:
        | "SOLICITADO"
        | "EN_REVISION"
        | "APROBADO"
        | "RECHAZADO"
        | "PAGADO"
      tipo_transaccion: "INGRESO" | "GASTO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["USUARIO", "CONTADOR", "ADMIN"],
      estatus_credito: [
        "SOLICITADO",
        "EN_REVISION",
        "APROBADO",
        "RECHAZADO",
        "PAGADO",
      ],
      tipo_transaccion: ["INGRESO", "GASTO"],
    },
  },
} as const
