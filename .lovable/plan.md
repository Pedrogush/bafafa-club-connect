## O que muda (visão geral)

Preserva 100% do design system atual (cores, tipografia, cards, tom de voz) e as tabelas já criadas na Etapa 1. Muda o **login**, a **navegação inferior**, a **home**, e adiciona a espinha dorsal de **eventos → check-in → mimo → selo/título**. Módulos sociais/assinatura ficam no banco mas somem da UI.

## Decisões travadas

- **OTP:** Twilio Verify (WhatsApp com fallback SMS). Implemento tudo em modo "teste" até você me passar `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e `TWILIO_VERIFY_SERVICE_SID`. Sem essas 3 credenciais o app **não** envia OTP para números reais — apenas mostra o código na tela para contas com sufixo `+test` (bloqueado em produção).
- **Dados da Etapa 1:** preservo estrutura, limpo dados de teste antes de popular os demos.
- **Login antigo (e-mail/senha):** fica desativado na UI mas as tabelas continuam. Contas admin/staff internas continuam podendo entrar por e-mail no `/staff/login` (senão você fica travado fora do painel).

## Faseamento (vou executar em turnos separados para você validar cada peça)

### Turno 1 — Fundação de dados + feature flags (este próximo turno)
- Migration única criando/ajustando: `events`, `event_categories`, `checkins`, `campaigns`, `campaign_rules`, `user_rewards`, `reward_redemptions`, `badge_definitions`, `user_badges`, `title_definitions`, `user_titles`, `qr_tokens` (tokens efêmeros server-side).
- Enum `app_role` ganha `staff` (mapeado para o "equipe" já existente — reutilizo `equipe`).
- Função `public.calculate_profile_completeness(uuid)` centralizada (regra oficial de % do perfil).
- Trigger de check-in: impede duplicado por `(user_id, event_id)`, dispara concessão automática de selos elegíveis, dispara emissão de mimo se houver campanha ativa.
- RLS: usuário lê só o próprio; staff/admin escreve check-in e redenção; admin CRUD em eventos/campanhas/selos.
- Grants explícitos em todas as tabelas novas.
- `app_settings.feature_flags` JSON com `{ fofoquinhas:false, reservas:false, assinaturas:false, indicacoes:false, chat:false }`.
- Auditoria: writes de `audit_logs` só via server functions (já corrigido no scan anterior).

### Turno 2 — Auth por telefone + onboarding mínimo
- Nova rota pública `/entrar` com dois passos: telefone (máscara BR, seletor país default +55) → OTP 6 dígitos (auto-preenchimento, reenvio com timer, limite de tentativas).
- Server functions: `requestPhoneOtp`, `verifyPhoneOtp` (chamam Twilio Verify via gateway; em modo teste retornam o código para o cliente apenas se e-mail termina em `+test@bafafa.local`).
- Rate limit por IP + telefone em tabela `otp_attempts` (janela deslizante).
- `/onboarding`: nome, nascimento, confirmação 18+, aceite de Termos + Privacidade. Barra de progresso simples.
- `/auth` (e-mail/senha) permanece **apenas** para staff/admin, oculto — link discreto no rodapé.
- Consentimento de marketing: card separado, opt-in, revogável, registrado em `user_consents` com versão do texto.

### Turno 3 — Home, Eventos, Perfil progressivo, Selos/Títulos
- Bottom nav vira: Início · Eventos · **Check-in** (centro destacado) · Mimos · Perfil.
- Home reformulada com: saudação, próximo evento, promoção ativa, botão check-in, % perfil + próximo campo sugerido, selos recentes, título ativo, mimos disponíveis, últimos check-ins.
- `/eventos` lista + `/eventos/$id` detalhe.
- `/perfil` com controles de privacidade (telefone/nascimento/bairro sempre privados), edição de nome/@/foto/cidade/bairro/bio/preferências, seção "Meus selos e títulos" com escolha do título ativo.

### Turno 4 — Check-in QR + Mimos + tela da equipe
- `/check-in` (usuário): gera QR com token de 30s (server-side, tabela `qr_tokens`, purpose=`checkin` ou `redemption`), rotaciona automaticamente, mostra também código numérico 6 dígitos.
- `/mimos`: filtros Disponíveis/Utilizados/Expirados, botão "Usar meu mimo" que gera QR de resgate.
- `/staff/checkin` (papel `equipe`): scanner QR (usando `@zxing/browser`) + input manual, valida token, mostra nome/foto do cliente, confirma check-in, mostra mimo liberado.
- `/staff/mimos`: valida QR de resgate, marca `reward_redemptions` como usado, registra funcionário/horário.

### Turno 5 — Painel admin reduzido + dados demo + relatório final
- `/admin` com abas: Visão geral, Eventos, Campanhas, Clientes, Check-ins, Mimos, Selos, Equipe, Auditoria, Configurações.
- KPIs pedidos no brief.
- Filtros de clientes por completude/evento/selo/consentimento/etc.
- Seed de 4 eventos + 3 campanhas + 10 usuários demo (telefones `+55 (11) 99999-000X`, todos com sufixo `+demo`), check-ins/mimos em vários estados.
- Documento final com tudo do item 19.

## Detalhes técnicos (para você conferir)

**Twilio Verify pelo gateway:**
- POST `/v2/Services/{SID}/Verifications` com `To=+55…&Channel=whatsapp`
- POST `/v2/Services/{SID}/VerificationCheck` com `To=+55…&Code=123456`
- Chamado por server function `requestPhoneOtp`/`verifyPhoneOtp`, nunca do browser.
- Após check aprovado, uso `supabaseAdmin.auth.admin` para: (a) achar user por `phone`, (b) criar se não existe com `phone_confirm:true`, (c) gerar magic-link/OTP interno do Supabase para estabelecer sessão no cliente. Alternativa: sessão custom via cookie assinado + `useSession`.

**QR seguro:**
- Tabela `qr_tokens(token uuid, user_id, purpose, ref_id, expires_at)`, TTL 30s, uso único.
- Payload do QR é só o `token` — nenhum PII.

**Completude do perfil:** função SQL centralizada; frontend só lê o valor calculado.

**Selos automáticos:** trigger `AFTER INSERT ON checkins` roda `grant_eligible_badges(user_id)` que checa regras (primeiro check-in, 3, 5, categoria feijoada, perfil 100%, etc).

## O que fica pendente / limitações conhecidas

- Twilio Verify precisa das 3 secrets acima antes de virar produção — aviso no admin.
- WhatsApp Business no Twilio Verify exige template aprovado; se não tiver, o Verify cai automaticamente para SMS.
- Reservas, Fofoquinhas, planos pagos, chat, indicações: **código preservado no repo** mas rotas removidas do routeTree; podem voltar mudando a feature flag.
- Storage de fotos de perfil: já existe? Preciso criar um bucket `avatars` no Turno 3 se você concordar.
- Login e-mail/senha permanece como "porta dos fundos" para admin/staff. Se preferir que suma totalmente, me avise.

## Confirmação antes de começar

Se aprovar, começo pelo **Turno 1 (migration da fundação de dados + feature flags)** já no próximo turno. Nada quebra a tela atual — só cria estrutura no banco. Depois seguimos turno a turno.