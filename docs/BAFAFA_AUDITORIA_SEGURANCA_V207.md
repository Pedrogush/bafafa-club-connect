# Bafafá Connect — Auditoria de Segurança V20.7

Status: EM ANDAMENTO  
Ambiente analisado: Supabase `xijjohgokwfkqfkkhsyn`  
Branch: `codex/v20-7-hardening-rpc-comercial`  
Regra: nenhuma promoção do frontend para produção enquanto houver bloqueador crítico ou alto sem tratamento.

## Objetivo

Avaliar autenticação, sessões, autorização, RLS, RPCs, funções `SECURITY DEFINER`, dados pessoais, integridade comercial, abuso do produto, dependências e configuração da infraestrutura.

## Método

Cada controle deve ter teste negativo e positivo:

- `anon` → somente operações públicas intencionais;
- usuário autenticado comum → apenas seus próprios dados e ações;
- conta privilegiada em `aal1` → negada;
- conta privilegiada em `aal2` → permitida conforme o papel;
- chamada direta da API → mesma decisão do aplicativo;
- `service_role` → somente rotinas internas autorizadas.

## Pacote 01 — aplicado em 03/08/2026

Migration aplicada:

`20260803143000_security_hardening_rpc_commercial_v207.sql`

Registro do Supabase:

`20260803142954 — security_hardening_rpc_commercial_v207`

Verificação executada:

- funções compilaram numa transação de simulação e foram revertidas antes da aplicação;
- chamada sem sessão a `sync_event_statuses()` foi negada;
- chamada sem sessão a `record_customer_sale()` foi negada;
- `anon` não possui `EXECUTE` nas duas funções;
- `authenticated` não possui `EXECUTE` na implementação comercial interna;
- o wrapper público remove `unit_price_cents` e `unit_cost_cents` antes de encaminhar a venda;
- tentativas de adulteração possuem evento de segurança dedicado;
- resultado estrutural: `verificacao_estrutural_ok = true`.

Limitação da evidência automática:

O conector bloqueou a simulação de JWTs artificiais com `aal1` e `aal2`. O arquivo `docs/VERIFICAR_HARDENING_RPC_COMERCIAL_V207.sql` contém o teste transacional completo para execução pelo SQL Editor. Não considerar o teste direto `aal1`/`aal2` deste pacote concluído até essa execução manual ou uma suíte automatizada equivalente.

## Achados

### SEC-001 — Execução pública de funções `SECURITY DEFINER`

Severidade preliminar: MÉDIA, requer classificação individual.

O Supabase Security Advisor identifica funções executáveis por `anon`:

- `check_content_allowed(text,text)`;
- `event_fofocometro(uuid)`;
- `get_public_profile(text)`.

Essas funções parecem ligadas a funcionalidades públicas, mas devem ser revisadas quanto a enumeração, vazamento de dados, abuso, limites de chamada e necessidade real de `SECURITY DEFINER`.

Status: EM ANÁLISE.

### SEC-002 — `sync_event_statuses()` executável sem autorização interna

Severidade original: ALTA.

Correção aplicada:

- exige `service_role` ou `admin` validado por `has_role()`;
- `admin` depende de sessão `aal2` por meio do guard central;
- revogado `EXECUTE` de `PUBLIC` e `anon`;
- alterações administrativas geram auditoria quando executadas por usuário;
- chamada sem sessão foi testada e negada.

Risco residual:

A função continua com `EXECUTE` para `authenticated` por compatibilidade com o aplicativo e, por isso, permanece como aviso genérico no Security Advisor. O controle efetivo está dentro da função. Deve ser validado diretamente com usuário comum, `admin/aal1` e `admin/aal2`.

Status: CORRIGIDO — VALIDAÇÃO DIRETA DE TOKENS PENDENTE.

### SEC-003 — Funções administrativas expostas a `authenticated`

Severidade preliminar: BAIXA a ALTA, conforme a função.

O Advisor sinaliza diversas funções administrativas porque possuem `EXECUTE` para `authenticated`. Várias validam `has_role()`, cuja implementação exige `aal2` para `admin`, `moderador` e `equipe`.

Isso reduz o risco, mas ainda exige:

- teste direto em `aal1`;
- teste com usuário comum;
- revisão de todos os caminhos internos;
- revogação de `EXECUTE` quando a função não precisar estar exposta;
- confirmação de `search_path` seguro.

Status: EM ANÁLISE; não tratar os avisos como falso positivo sem teste.

### SEC-004 — Integridade de preços e custos em `record_customer_sale()`

Severidade original: CRÍTICA/ALTA.

Correção aplicada:

- a implementação anterior foi renomeada para `record_customer_sale_internal_v207()`;
- a função interna não possui `EXECUTE` para `PUBLIC`, `anon`, `authenticated` ou `service_role`;
- o endpoint público mantém a mesma assinatura para não quebrar o frontend;
- preço e custo recebidos são comparados ao catálogo;
- divergência ou valor inválido gera `security_events` com chave `sale_catalog_tampering`;
- `unit_price_cents` e `unit_cost_cents` são removidos antes da chamada interna;
- a lógica interna volta a buscar preço e custo diretamente de `products`;
- origem diferente de `manual` é bloqueada e registrada;
- taxas, gorjeta e couvert negativos ou acima de R$ 1.000 por campo são rejeitados;
- tamanho do JSON, quantidade de itens, token e referência externa receberam limites.

Risco residual:

Taxa de serviço, gorjeta e couvert ainda são informados por uma conta de equipe em `aal2`, embora agora possuam limites e auditoria. O desenho definitivo deve definir se esses valores virão de produtos/configuração do evento ou de uma função separada com justificativa.

Status: BLOQUEADOR PRINCIPAL CORRIGIDO — TESTE DE VENDA REAL E POLÍTICA DE TAXAS PENDENTES.

### SEC-005 — Proteção contra senhas vazadas desativada

Severidade preliminar: MÉDIA.

O Supabase Auth continua com leaked password protection desativada.

Ação:

- habilitar a proteção no painel do Auth, caso disponível no plano;
- testar cadastro, troca e recuperação de senha;
- manter mensagens que não revelem se uma conta existe.

Status: PENDENTE.

### SEC-006 — Tabela privada sem política RLS

Severidade preliminar: INFORMATIVA.

`private.content_moderation_terms` possui RLS sem políticas. Como está no schema `private`, isso pode ser intencional e seguro, desde que não esteja exposta na API e somente funções controladas tenham acesso.

Status: VALIDAR exposição de schemas e grants.

## Controles já confirmados

### 2FA privilegiado

- `has_role()` exige `aal2` para `admin`, `moderador` e `equipe`;
- teste manual confirmou bloqueio do aplicativo antes do segundo fator;
- a proteção precisa continuar sendo testada diretamente na API.

Status: PARCIALMENTE VALIDADO.

### Chat de eventos

`can_access_event_chat()` e `can_read_event_chat()` rejeitam `_user_id` diferente de `auth.uid()`, exigem maioridade e check-in para usuários comuns e usam `has_role()` para privilégios.

Status: REVISÃO INICIAL FAVORÁVEL; testes negativos ainda necessários.

## Próximas etapas

1. executar `docs/VERIFICAR_HARDENING_RPC_COMERCIAL_V207.sql` no SQL Editor para validar `aal1` e `aal2`;
2. fazer uma venda controlada com os valores normais do catálogo;
3. tentar uma chamada adulterada com preço e custo divergentes e confirmar bloqueio;
4. inventariar grants de todas as RPCs e tabelas;
5. revisar RLS tabela por tabela;
6. revisar funções que recebem IDs de outros usuários;
7. revisar Storage e Edge Functions;
8. verificar segredos, cabeçalhos, CORS e variáveis;
9. revisar dependências e CI;
10. habilitar proteção contra senhas vazadas;
11. atualizar o Documento Mestre AI-First.

## Critério de liberação

O piloto só poderá ser promovido quando:

- não houver achados críticos ou altos abertos;
- cada operação privilegiada tiver teste `aal1` negado e `aal2` permitido;
- RLS e RPCs tiverem evidência de menor privilégio;
- dados pessoais não forem expostos a usuários indevidos;
- integridade comercial estiver protegida no servidor;
- correções estiverem documentadas e reproduzíveis.
