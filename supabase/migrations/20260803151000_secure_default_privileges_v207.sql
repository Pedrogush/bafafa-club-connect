-- V20.7 — objetos futuros fechados por padrão.
--
-- Não altera grants de tabelas, sequências ou funções já existentes.
-- A partir desta migration, novos objetos no schema public somente ficam
-- disponíveis à API quando a própria migration conceder os privilégios mínimos.

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger
  on tables from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke usage, select, update
  on sequences from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute
  on functions from public, anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke select, insert, update, delete, truncate, references, trigger
  on tables from public, anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke usage, select, update
  on sequences from public, anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke execute
  on functions from public, anon, authenticated;
