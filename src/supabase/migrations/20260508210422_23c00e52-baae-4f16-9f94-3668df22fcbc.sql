-- Bucket privado para tickets/comprobantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas: cada usuario gestiona su carpeta {auth.uid()}/...
CREATE POLICY "Usuarios ven sus tickets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tickets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuarios suben sus tickets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tickets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuarios actualizan sus tickets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tickets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuarios borran sus tickets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tickets' AND auth.uid()::text = (storage.foldername(name))[1]);
