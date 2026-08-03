-- Verificação V20.7 — objetos futuros fechados por padrão.
-- Somente leitura.

with defaults as (
  select
    pg_get_userbyid(d.defaclrole) as owner,
    d.defaclobjtype as object_type,
    coalesce(d.defaclacl, '{}'::aclitem[])::text as acl
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  where n.nspname = 'public'
    and pg_get_userbyid(d.defaclrole) in ('postgres','supabase_admin')
    and d.defaclobjtype in ('r','S','f')
), checks as (
  select
    owner,
    count(*) filter (
      where object_type = 'r'
        and acl !~ '(^|,)(anon|authenticated)='
        and acl !~ '(^|,)PUBLIC='
    ) = 1 as future_tables_closed,
    count(*) filter (
      where object_type = 'S'
        and acl !~ '(^|,)(anon|authenticated)='
        and acl !~ '(^|,)PUBLIC='
    ) = 1 as future_sequences_closed,
    count(*) filter (
      where object_type = 'f'
        and acl !~ '(^|,)(anon|authenticated)='
        and acl !~ '(^|,)PUBLIC='
    ) = 1 as future_functions_closed
  from defaults
  group by owner
)
select
  bool_and(future_tables_closed) as future_tables_closed,
  bool_and(future_sequences_closed) as future_sequences_closed,
  bool_and(future_functions_closed) as future_functions_closed,
  count(*) = 2
    and bool_and(future_tables_closed)
    and bool_and(future_sequences_closed)
    and bool_and(future_functions_closed) as verificacao_ok
from checks;
