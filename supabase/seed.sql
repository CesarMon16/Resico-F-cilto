-- seed.sql
-- Este script inserta un usuario administrador por defecto en Supabase Auth y en las tablas públicas.
-- IMPORTANTE: Ejecutar esto en el SQL Editor de Supabase o mediante el CLI de Supabase (supabase db seed).

-- Correo: admin@facilito.com
-- Contraseña: password123

-- 1. Insertar el usuario en auth.users (la tabla de autenticación)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d',
  'authenticated',
  'authenticated',
  'admin@facilito.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Insertar la identidad vinculada en auth.identities
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at
) VALUES (
  'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d',
  'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d',
  format('{"sub":"%s","email":"%s"}', 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d', 'admin@facilito.com')::jsonb,
  'email',
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- 3. Crear el perfil en public.profiles
INSERT INTO public.profiles (id, nombre, correo)
VALUES ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d', 'Super Admin', 'admin@facilito.com')
ON CONFLICT (id) DO NOTHING;

-- 4. Asignar el rol ADMIN en public.user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d', 'ADMIN')
ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';
