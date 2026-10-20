-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Enums
CREATE TYPE public.report_target_type AS ENUM ('thread', 'reply');
