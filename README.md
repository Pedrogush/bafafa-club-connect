# BAFAFÁ — Clube dos Bafafãs

MVP mobile-first para aquisição e relacionamento de clientes do Bafafá Bar — Natal/RN.

## Foco desta versão

O produto foi reduzido para um ciclo simples:

**cadastro → perfil progressivo → evento → check-in → mimo → selo/título**

A navegação principal agora contém:

- **Início** — próximo evento, progresso do perfil, mimos e check-ins;
- **Eventos** — agenda e campanhas relacionadas;
- **Check-in** — código temporário de seis dígitos;
- **Mimos** — disponíveis, utilizados e expirados;
- **Perfil** — preferências, progresso, selos e título ativo.

Os módulos Fofoquinhas, Reservas, Assinaturas e rede social continuam fora da navegação e podem ser retomados no futuro.

## Autenticação

Durante o desenvolvimento, o aplicativo continua com **e-mail e senha**, evitando custo de SMS. O cadastro inicial foi reduzido ao essencial.

Antes do piloto com clientes reais, a autenticação deverá ser migrada para telefone + OTP. A função `handle_new_user` já foi adaptada para aceitar usuários criados por telefone no Supabase Auth.

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha somente as chaves públicas do Supabase.
3. Instale as dependências com o gerenciador do projeto.
4. Aplique as migrations em `supabase/migrations` no projeto Supabase correto.
5. Inicie o projeto com `npm run dev` ou o comando equivalente do seu ambiente.

Nunca coloque uma chave `service_role` no frontend ou em arquivos versionados.

## Migration principal desta entrega

`supabase/migrations/20260714140000_mvp_secure_checkin.sql`

Ela adiciona:

- correção de permissão da função `has_role` usada pelas políticas RLS;
- criação de códigos temporários de check-in e resgate;
- validação de check-in apenas por equipe/admin;
- liberação automática de campanhas após check-in;
- resgate de mimo apenas por equipe/admin;
- proteção do título ativo;
- títulos e selos sincronizados com check-ins e progresso do perfil;
- compatibilidade do gatilho de cadastro com telefone/OTP futuro.

## Papéis

- `gratuito`: cliente comum;
- `equipe`: valida check-ins e mimos;
- `moderador`: reservado para a fase social;
- `admin`: administração completa.

A rota operacional é `/staff/checkin`. Somente `equipe` e `admin` podem validar códigos.

## O que ainda falta

- autenticação real por telefone/OTP e provedor de SMS;
- leitura de QR pela câmera — esta versão usa código numérico seguro como alternativa funcional;
- CRUD visual de eventos e campanhas no painel administrativo;
- upload de foto de perfil;
- testes automatizados e pipeline de CI;
- política final de retenção e exportação de dados;
- promoção real definida pelo Bafafá.

## Teste rápido

O arquivo `docs/TESTE_MVP.sql` contém comandos opcionais para:

- promover a primeira conta a administrador;
- promover uma conta a equipe;
- criar um evento e uma campanha de demonstração.

Revise os e-mails e o produto antes de executar. O script não deve ser usado sem adaptação em produção.

## Painel administrativo v2

Esta versão adiciona um painel funcional em `/admin` para:

- visão geral do MVP;
- criar, editar e excluir eventos;
- criar, editar e excluir campanhas/mimos;
- consultar clientes e completude do perfil;
- consultar check-ins;
- conceder ou remover acesso de equipe e administrador;
- consultar auditoria.

Antes de usar o painel, execute uma única vez no SQL Editor do Supabase:

`docs/ADMIN_V2_SETUP.sql`

O script concede as permissões de banco necessárias, mantém o RLS, protege o último administrador e cria auditoria automática das alterações principais.

## Atualização: imagens e validade flexível

A versão inclui upload direto de imagens para eventos e fotos de perfil via Supabase Storage. Campanhas aceitam validade em minutos ou horas. Antes de testar, execute `docs/UPLOADS_AND_MINUTES_SETUP.sql` no SQL Editor do Supabase.

## Identidade visual Bafafá v4

Esta entrega aproxima o aplicativo da identidade real do Bafafá, preservando os fluxos existentes.

Principais mudanças:

- logo oficial aplicada no app, autenticação e ícones da PWA;
- paleta vibrante inspirada nas artes do Instagram;
- referências sutis a cartazes, adesivos, tijolinhos e à praça;
- nova apresentação para Início, Eventos, Check-in, Mimos e Perfil;
- cards de evento com linguagem de flyer;
- mimos em formato de cupom/ticket;
- perfil com aparência social, selos ao lado do nome e título ativo;
- selo manual **Sócio Fundador**, concedido e removido somente por administrador;
- perfil público seguro em `/u/<username>`;
- painel administrativo refinado sem perder clareza operacional.

Antes de testar esta versão, execute uma única vez no SQL Editor do Supabase:

`docs/BRAND_V4_SETUP.sql`

Depois reinicie o servidor local. O roteiro completo está em `docs/TESTE_IDENTIDADE_V4.md`.

## V6 — Perfil 100% e Resenha do Evento

A versão v6 centraliza o cálculo de completude do perfil no Supabase e adiciona uma sala pública por evento, acessível a clientes com check-in válido. A sala inclui mensagens em tempo real, respostas, denúncia, bloqueio, exclusão pelo autor e moderação no painel administrativo.

Configuração: `docs/PERFIL_E_RESENHA_V6_SETUP.sql`  
Roteiro de teste: `docs/TESTE_PERFIL_E_RESENHA_V6.md`
