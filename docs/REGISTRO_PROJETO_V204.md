# Registro do projeto — V20.4.1

## Versão e referência

- Versão anterior: V20.3.
- Versão desta atualização: V20.4.1 — prontidão e privacidade conciliada para o piloto.
- Branch canônica da aplicação completa: `mvp-checkin-v1`.
- Projeto Supabase: `xijjohgokwfkqfkkhsyn` (`bafafa-club-connect`).
- Projeto Vercel: `prj_h2SFRn7SZPyB38U8jQgPfYeEUCQD`.
- Produção não foi alterada nesta atualização.

## Decisões preservadas

- Navegação pública com BAFAFEED, Fofoquinhas, Resenha e Perfil.
- Agenda/Eventos preservada tecnicamente e oculta do cliente.
- Sessão da Casa é termo interno; o cliente vê apenas noite, presença e Resenha.
- Clique externo é mensurado, mas compra externa não é afirmada pelo app.
- Painel de criação de eventos não foi repaginado.

## Escopo concluído

- Consentimentos explícitos no telefone e no e-mail, versão 2.1.
- Marketing opcional e desligado por padrão.
- Página pública de termos, privacidade, comunidade e direitos.
- Perfil público fechado por padrão para novos cadastros.
- Dez perfis legados fechados por padrão, sem apagar dados, com snapshot em auditoria.
- Maioridade derivada do nascimento e exigida em check-in/Resenha.
- Salves lidos por RPC segura, sem leitura direta de perfis.
- Conversa privada com limite de envio, bloqueio, denúncia e moderação.
- Listagem ampla de objetos dos buckets públicos removida.
- Funções de gatilho indisponíveis como endpoints de cliente.
- Contraste, foco, navegação atual, alvos de toque e movimento reduzido revisados.
- CSP estática conciliada com o Google Maps já usado pelo painel.
- Tipos Supabase regenerados e `typecheck` incluído na CI.

## Banco e histórico

- Migration no repositório: `20260729120000_pilot_readiness_v204.sql`.
- Migration de conciliação: `20260730120000_privacy_defaults_v2041.sql`.
- Registro criado pelo conector no Supabase: `20260718033310 / pilot_readiness_v204`.
- Registro criado pelo conector para a conciliação: `20260718163928 / privacy_defaults_v2041`.
- A diferença de timestamp é do registro automático do conector; o SQL aplicado é o mesmo da migration.
- As migrations antigas continuam sem histórico remoto. Elas não devem ser reaplicadas em lote.
- Nenhum dado existente foi apagado. As preferências anteriores dos dez perfis foram preservadas em
  `audit_logs`; todos começaram privados e podem publicar novamente pelo próprio Perfil.

## Pendências antes de convidar usuários

1. Ativar proteção contra senhas vazadas no painel do Supabase Auth.
2. Confirmar provedor de SMS, remetente e entrega real de OTP em um telefone externo.
3. Definir e publicar canal de atendimento, razão social/CNPJ e prazo formal de retenção após revisão jurídica.
4. Executar o roteiro de aceitação em dois celulares reais e com contas distintas.
5. Criar backup imediatamente antes do primeiro piloto e registrar responsável operacional.

## Riscos conhecidos

- 54 avisos do advisor sobre `SECURITY DEFINER` permanecem porque as RPCs são endpoints intencionais;
  cada função precisa continuar validando `auth.uid()` e/ou papel internamente.
- Há 183 alertas de performance herdados. Alterações globais de índices e RLS foram adiadas para não
  aumentar o risco antes do piloto; medir lentidão real antes de priorizar.
- A conciliação dos dez perfis existentes foi executada e verificada: nenhum permanece público.
- Não há suíte automatizada de E2E. Build, lint, tipos, verificação SQL e resposta HTTP local cobrem a
  atualização, mas não substituem os testes em aparelhos reais.
- Os bundles principais continuam acima de 500 kB; dividir scanner e painel é a próxima otimização.

## Próximo passo recomendado

Executar o roteiro `TESTE_ACEITACAO_PILOTO_V204.md` em uma janela operacional controlada. Só depois
aprovar o merge e o comando de deploy de produção.
