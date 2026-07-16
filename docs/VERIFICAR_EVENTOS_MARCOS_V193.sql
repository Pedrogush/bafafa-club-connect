-- Verificação rápida da atualização V19.3

SELECT
  to_regprocedure('public.sync_event_statuses()') IS NOT NULL AS sincronizacao_eventos_ok,
  to_regprocedure('public.event_status_from_schedule(text,timestamptz,timestamptz,timestamptz)') IS NOT NULL AS regra_status_ok,
  to_regprocedure('public.refresh_user_milestone_rewards(uuid)') IS NOT NULL AS marcos_ok;

SELECT public.sync_event_statuses() AS eventos_atualizados_agora;

SELECT
  id,
  name,
  starts_at,
  ends_at,
  status,
  public.event_status_from_schedule(status, starts_at, ends_at, now()) AS status_esperado
FROM public.events
ORDER BY starts_at DESC
LIMIT 30;

SELECT
  id,
  name,
  trigger_type,
  trigger_target,
  requires_staff_validation,
  requires_min_profile,
  status
FROM public.campaigns
WHERE campaign_kind = 'milestone'
ORDER BY created_at DESC;
