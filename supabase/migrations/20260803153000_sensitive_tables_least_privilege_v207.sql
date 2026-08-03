-- V20.7 — menor privilégio em tabelas sensíveis.
--
-- Remove acessos diretos que não são necessários ao frontend. Operações de
-- escrita continuam disponíveis somente pelas RPCs SECURITY DEFINER que fazem
-- validação de papel, AAL2, consistência e auditoria.

-- Nenhuma destas tabelas possui uso público direto intencional.
revoke all privileges on table public.qr_tokens from anon;
revoke all privileges on table public.sales from anon;
revoke all privileges on table public.sale_items from anon;
revoke all privileges on table public.checkins from anon;
revoke all privileges on table public.user_rewards from anon;
revoke all privileges on table public.reward_redemptions from anon;
revoke all privileges on table public.user_roles from anon;
revoke all privileges on table public.user_consents from anon;
revoke all privileges on table public.user_preferences from anon;

-- QR é criado/consumido pelas RPCs create_my_qr_token, validate_checkin_qr,
-- inspect_commercial_qr e fluxos comerciais. O cliente só precisa ler os seus.
revoke insert, update, delete, truncate, references, trigger, maintain
  on table public.qr_tokens from authenticated;
grant select on table public.qr_tokens to authenticated;

-- Vendas são registradas por record_customer_sale() e alteradas por
-- admin_change_sale_status(). A policy de UPDATE direto permitia contornar a
-- validação e a auditoria da RPC.
drop policy if exists "Admins manage sales" on public.sales;
revoke insert, update, delete, truncate, references, trigger, maintain
  on table public.sales from authenticated;
grant select on table public.sales to authenticated;

-- Itens de venda são derivados e só devem ser escritos pelo motor comercial.
revoke insert, update, delete, truncate, references, trigger, maintain
  on table public.sale_items from authenticated;
grant select on table public.sale_items to authenticated;

-- Demais tabelas sensíveis mantêm apenas os comandos já necessários às policies
-- existentes. Privilégios estruturais não são necessários para a API.
revoke truncate, references, trigger, maintain
  on table public.checkins,
           public.user_rewards,
           public.reward_redemptions,
           public.user_roles,
           public.user_consents,
           public.user_preferences
  from authenticated;
