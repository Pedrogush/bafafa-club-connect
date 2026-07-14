
-- ========== 1. PROFILES: extra fields ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS how_found_us text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS active_title_id uuid;

-- ========== 2. USER_PREFERENCES: extra fields ==========
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS drink_preferences text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS food_preferences text[] NOT NULL DEFAULT '{}';

-- ========== 3. EVENTS ==========
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  category text NOT NULL,
  attraction text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  checkin_opens_at timestamptz,
  checkin_closes_at timestamptz,
  checkin_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'scheduled',
  instructions text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events(starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

GRANT SELECT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads active events" ON public.events
  FOR SELECT USING (status IN ('scheduled','ongoing','ended') AND checkin_enabled = true OR status IN ('scheduled','ongoing','ended'));
CREATE POLICY "Admins manage events" ON public.events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== 4. CAMPAIGNS ==========
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  benefit_type text NOT NULL,        -- percent_off | fixed_off | freebie | bogo | custom
  discount_percent numeric(5,2),
  discount_max_cents integer,
  fixed_off_cents integer,
  product_name text,
  instructions text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  reward_valid_hours integer NOT NULL DEFAULT 24,
  total_available integer,
  per_user_limit integer NOT NULL DEFAULT 1,
  requires_checkin boolean NOT NULL DEFAULT true,
  requires_min_profile boolean NOT NULL DEFAULT true,
  required_badge_id uuid,
  status text NOT NULL DEFAULT 'active', -- active | paused | ended
  public_rules text,
  internal_rules text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_event ON public.campaigns(event_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads active campaigns" ON public.campaigns
  FOR SELECT USING (status = 'active');
CREATE POLICY "Admins manage campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== 5. CHECKINS ==========
CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  method text NOT NULL DEFAULT 'qr', -- qr | manual | code
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event ON public.checkins(event_id);

GRANT SELECT ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own checkins" ON public.checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff read all checkins" ON public.checkins
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'equipe') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff insert checkins" ON public.checkins
  FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'equipe') OR public.has_role(auth.uid(),'admin')) AND auth.uid() = staff_id);
-- NB: users cannot self-check-in via Data API; only server code (service_role) or staff can insert.

-- ========== 6. USER_REWARDS (mimos concedidos) ==========
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  checkin_id uuid REFERENCES public.checkins(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available', -- available | redeemed | expired | revoked
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_rewards_user_campaign ON public.user_rewards(user_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_status ON public.user_rewards(status);

GRANT SELECT ON public.user_rewards TO authenticated;
GRANT ALL ON public.user_rewards TO service_role;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own rewards" ON public.user_rewards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff read all rewards" ON public.user_rewards
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'equipe') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_user_rewards_updated_at BEFORE UPDATE ON public.user_rewards
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== 7. REWARD REDEMPTIONS (utilizações) ==========
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id uuid NOT NULL REFERENCES public.user_rewards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reward_id)
);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.reward_redemptions(user_id);

GRANT SELECT ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own redemptions" ON public.reward_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff read all redemptions" ON public.reward_redemptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'equipe') OR public.has_role(auth.uid(),'admin'));

-- ========== 8. BADGES ==========
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'sparkles',
  rule text,          -- human-readable
  auto_rule text,     -- machine slug the trigger checks (first_checkin, five_checkins, etc)
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badge_definitions TO anon, authenticated;
GRANT ALL ON public.badge_definitions TO service_role;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone reads badge defs" ON public.badge_definitions FOR SELECT USING (is_active);
CREATE POLICY "Admins manage badge defs" ON public.badge_definitions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_badge_defs_updated_at BEFORE UPDATE ON public.badge_definitions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  is_featured boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  awarded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, badge_id)
);
GRANT SELECT ON public.user_badges TO authenticated;
-- Allow user to update visibility flags only:
GRANT UPDATE (is_featured, is_hidden) ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own badges" ON public.user_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own badge visibility" ON public.user_badges
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Inserts/deletes only via service_role (trigger or admin fn).

-- ========== 9. TITLES ==========
CREATE TABLE IF NOT EXISTS public.title_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  rule text,
  auto_rule text,
  linked_badge_id uuid REFERENCES public.badge_definitions(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.title_definitions TO anon, authenticated;
GRANT ALL ON public.title_definitions TO service_role;
ALTER TABLE public.title_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone reads title defs" ON public.title_definitions FOR SELECT USING (is_active);
CREATE POLICY "Admins manage title defs" ON public.title_definitions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_title_defs_updated_at BEFORE UPDATE ON public.title_definitions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id uuid NOT NULL REFERENCES public.title_definitions(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, title_id)
);
GRANT SELECT ON public.user_titles TO authenticated;
GRANT ALL ON public.user_titles TO service_role;
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own titles" ON public.user_titles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles.active_title_id foreign key (deferred until table exists)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_active_title_fk
  FOREIGN KEY (active_title_id) REFERENCES public.title_definitions(id) ON DELETE SET NULL;

-- ========== 10. QR TOKENS (efêmeros) ==========
CREATE TABLE IF NOT EXISTS public.qr_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL, -- 'checkin' | 'redemption'
  ref_id uuid,           -- reward_id when purpose=redemption
  short_code text NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_user ON public.qr_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_short ON public.qr_tokens(short_code) WHERE used_at IS NULL;

GRANT SELECT ON public.qr_tokens TO authenticated;
GRANT ALL ON public.qr_tokens TO service_role;
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own qr tokens" ON public.qr_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- All inserts/updates only via service_role.

-- ========== 11. OTP ATTEMPTS ==========
CREATE TABLE IF NOT EXISTS public.otp_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  ip_address text,
  kind text NOT NULL, -- 'request' | 'verify'
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone_time ON public.otp_attempts(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_ip_time ON public.otp_attempts(ip_address, created_at DESC);
GRANT ALL ON public.otp_attempts TO service_role;
ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;
-- No authenticated policies: server-only.

-- ========== 12. PROFILE COMPLETENESS FUNCTION ==========
CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  prefs public.user_preferences%ROWTYPE;
  total integer := 0;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT * INTO prefs FROM public.user_preferences WHERE user_id = _user_id;

  -- phone verified: 20
  IF p.phone_verified_at IS NOT NULL THEN total := total + 20; END IF;
  -- name + birth_date: 20
  IF coalesce(p.display_name,'') <> '' AND p.birth_date IS NOT NULL THEN total := total + 20; END IF;
  -- city + neighborhood: 15
  IF coalesce(p.city,'') <> '' AND coalesce(p.neighborhood,'') <> '' THEN total := total + 15; END IF;
  -- event preferences: 15
  IF prefs.event_categories IS NOT NULL AND array_length(prefs.event_categories,1) >= 1 THEN total := total + 15; END IF;
  -- drink/food preferences: 15
  IF (prefs.drink_preferences IS NOT NULL AND array_length(prefs.drink_preferences,1) >= 1)
     OR (prefs.food_preferences IS NOT NULL AND array_length(prefs.food_preferences,1) >= 1)
  THEN total := total + 15; END IF;
  -- how_found_us: 10
  IF coalesce(p.how_found_us,'') <> '' THEN total := total + 10; END IF;
  -- photo or bio: 5
  IF coalesce(p.avatar_url,'') <> '' OR coalesce(p.bio,'') <> '' THEN total := total + 5; END IF;

  RETURN LEAST(total, 100);
END $$;

REVOKE ALL ON FUNCTION public.calculate_profile_completeness(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completeness(uuid) TO service_role;

-- Wrapper for the current user (safe to expose)
CREATE OR REPLACE FUNCTION public.my_profile_completeness()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.calculate_profile_completeness(auth.uid()); $$;
REVOKE ALL ON FUNCTION public.my_profile_completeness() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_profile_completeness() TO authenticated;

-- ========== 13. AUTO-BADGE TRIGGER ==========
CREATE OR REPLACE FUNCTION public.grant_badge_by_slug(_user_id uuid, _slug text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE bid uuid;
BEGIN
  SELECT id INTO bid FROM public.badge_definitions WHERE slug = _slug AND is_active;
  IF bid IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, bid)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.tg_checkin_after_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cnt integer;
  evt_category text;
BEGIN
  SELECT count(*) INTO cnt FROM public.checkins WHERE user_id = NEW.user_id;
  SELECT category INTO evt_category FROM public.events WHERE id = NEW.event_id;

  IF cnt >= 1 THEN PERFORM public.grant_badge_by_slug(NEW.user_id, 'primeiro-bafafa'); END IF;
  IF cnt >= 3 THEN PERFORM public.grant_badge_by_slug(NEW.user_id, 'presenca-confirmada'); END IF;
  IF cnt >= 5 THEN PERFORM public.grant_badge_by_slug(NEW.user_id, 'nao-perde-um-pagode'); END IF;
  IF lower(coalesce(evt_category,'')) = 'feijoada' THEN
    PERFORM public.grant_badge_by_slug(NEW.user_id, 'sobreviveu-feijoada');
  END IF;

  -- Update phone_verified badge if applicable
  IF public.calculate_profile_completeness(NEW.user_id) >= 40 THEN
    PERFORM public.grant_badge_by_slug(NEW.user_id, 'bafafã-verificado');
  END IF;
  IF public.calculate_profile_completeness(NEW.user_id) >= 100 THEN
    PERFORM public.grant_badge_by_slug(NEW.user_id, 'perfil-no-grau');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_checkin_after_insert ON public.checkins;
CREATE TRIGGER trg_checkin_after_insert
  AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.tg_checkin_after_insert();

-- ========== 14. FEATURE FLAGS ==========
INSERT INTO public.app_settings (key, value, description)
VALUES ('feature_flags',
  '{"fofoquinhas":false,"reservas":false,"assinaturas":false,"indicacoes":false,"chat":false,"phone_auth":true,"email_auth_public":false}'::jsonb,
  'Módulos ativos/desativados do app.')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = now();

-- ========== 15. SEED BADGES + TITLES (idempotente) ==========
INSERT INTO public.badge_definitions (slug, name, description, icon, rule, auto_rule, sort_order) VALUES
  ('bafafã-verificado', 'Bafafã Verificado', 'Telefone confirmado e perfil mínimo preenchido.', 'badge-check', 'Verificar telefone e completar 40% do perfil.', 'profile_min', 10),
  ('perfil-no-grau', 'Perfil no Grau', 'Perfil 100% completo.', 'user-check', 'Completar 100% do perfil.', 'profile_full', 20),
  ('primeiro-bafafa', 'Primeiro Bafafá', 'Primeiro check-in válido.', 'party-popper', 'Fazer o primeiro check-in em um evento.', 'first_checkin', 30),
  ('presenca-confirmada', 'Presença Confirmada', 'Três check-ins válidos.', 'calendar-check', 'Fazer 3 check-ins.', 'three_checkins', 40),
  ('nao-perde-um-pagode', 'Não Perde um Pagode', 'Cinco check-ins válidos.', 'music', 'Fazer 5 check-ins.', 'five_checkins', 50),
  ('sobreviveu-feijoada', 'Sobreviveu à Feijoada', 'Check-in em evento da categoria Feijoada.', 'utensils', 'Check-in em um evento Feijoada.', 'feijoada_checkin', 60),
  ('trouxe-resenha', 'Trouxe a Resenha', 'Condição configurável pela administração.', 'users', 'Definido pela administração.', 'manual', 70),
  ('bafafa-fundador', 'Bafafã Fundador', 'Concedido manualmente pela administração.', 'crown', 'Concedido pela administração.', 'manual', 80)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.title_definitions (slug, name, description, auto_rule, sort_order) VALUES
  ('cheguei-no-bafafa', 'Cheguei no Bafafá', 'Título de boas-vindas.', 'signup', 10),
  ('perfil-no-grau', 'Perfil no Grau', 'Perfil 100% completo.', 'profile_full', 20),
  ('primeiro-bafafa', 'Primeiro Bafafá', 'Primeiro check-in.', 'first_checkin', 30),
  ('presenca-confirmada', 'Presença Confirmada', '3 check-ins.', 'three_checkins', 40),
  ('nao-perde-um-pagode', 'Não Perde um Pagode', '5 check-ins.', 'five_checkins', 50),
  ('sobreviveu-feijoada', 'Sobreviveu à Feijoada', 'Check-in em Feijoada.', 'feijoada_checkin', 60),
  ('bafafa-fundador', 'Bafafã Fundador', 'Concedido pela administração.', 'manual', 70)
ON CONFLICT (slug) DO NOTHING;

-- Link titles to matching badges
UPDATE public.title_definitions t SET linked_badge_id = b.id
  FROM public.badge_definitions b WHERE b.slug = t.slug AND t.linked_badge_id IS NULL;
