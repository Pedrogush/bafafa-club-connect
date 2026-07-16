import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/brand/wordmark";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { TurnstileChallenge, useAuthCaptcha } from "@/components/auth/turnstile";
import { friendlyAuthError, isPrivilegedRole, validatePassword } from "@/lib/auth-security";

type Mode = "signin" | "signup" | "reset";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "reset"]).catch("signin"),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/inicio" });
  },
  component: AuthPage,
});

const signupSchema = z
  .object({
    display_name: z.string().trim().min(2, "Diz teu nome, Bafafã.").max(80),
    email: z.string().trim().email("E-mail inválido.").max(255),
    password: z.string(),
    password_confirm: z.string(),
    birth_date: z.string().min(10, "Data de nascimento obrigatória."),
    accept_terms: z.literal(true, { errorMap: () => ({ message: "Precisa aceitar os termos." }) }),
    accept_privacy: z.literal(true, {
      errorMap: () => ({ message: "Precisa aceitar a política de privacidade." }),
    }),
    is_over_18: z.literal(true, { errorMap: () => ({ message: "Só maiores de 18 anos." }) }),
    marketing_opt_in: z.boolean().optional().default(false),
  })
  .refine((value) => validatePassword(value.password).valid, {
    message: "A senha não atende aos requisitos de segurança.",
    path: ["password"],
  })
  .refine((value) => value.password === value.password_confirm, {
    message: "As senhas precisam ser iguais.",
    path: ["password_confirm"],
  })
  .refine(
    (value) => {
      const date = new Date(value.birth_date);
      if (Number.isNaN(date.getTime())) return false;
      const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18;
    },
    { message: "Cadastro só para 18+.", path: ["birth_date"] },
  );

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode);
  useEffect(() => setMode(initialMode), [initialMode]);

  return (
    <div className="app-canvas min-h-screen px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="flex justify-center">
          <Link to="/" className="inline-block">
            <Wordmark variant="full" />
          </Link>
        </div>
        <div className="poster-card checker-texture mt-6 p-4 text-center text-foreground">
          <p className="section-kicker">Cerveja gelada e batucada</p>
          <h1 className="mt-2 font-display text-4xl leading-none">
            Seu lugar na roda começa aqui.
          </h1>
        </div>
        <div className="mt-6 flex rounded-2xl border-2 border-foreground bg-card p-1 text-sm font-black shadow-[3px_4px_0_var(--foreground)]">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full px-3 py-2 transition ${
                mode === m ? "bg-lagoa text-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Entrar" : "Criar cadastro"}
            </button>
          ))}
        </div>

        <div className="sticker-card mt-6 bg-card p-5">
          {mode === "signup" && <SignupForm onDone={() => setMode("signin")} />}
          {mode === "signin" && <SigninForm onForgot={() => setMode("reset")} />}
          {mode === "reset" && <ResetForm onDone={() => setMode("signin")} />}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border-2 border-foreground/20 bg-surface px-4 py-3 text-base font-semibold outline-none transition focus:border-electric focus:ring-4 focus:ring-lagoa/20";

function SignupForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const captcha = useAuthCaptcha();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const raw = {
      display_name: fd.get("display_name") as string,
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      password_confirm: fd.get("password_confirm") as string,
      birth_date: fd.get("birth_date") as string,
      accept_terms: fd.get("accept_terms") === "on",
      accept_privacy: fd.get("accept_privacy") === "on",
      is_over_18: fd.get("is_over_18") === "on",
      marketing_opt_in: fd.get("marketing_opt_in") === "on",
    };
    const parsed = signupSchema.safeParse(raw);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[issue.path[0] as string] = issue.message;
      setErrors(nextErrors);
      return;
    }

    const data = parsed.data;
    if (captcha.required && !captcha.token) {
      setErrors({ captcha: "Confirme o desafio de segurança." });
      return;
    }
    setLoading(true);
    const { data: signUp, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/inicio`,
        captchaToken: captcha.token ?? undefined,
        data: {
          display_name: data.display_name,
          birth_date: data.birth_date,
          is_over_18: true,
          accept_terms: true,
          accept_privacy: true,
          accept_community: true,
          marketing_opt_in: data.marketing_opt_in,
          consent_version: "1.0",
        },
      },
    });
    setLoading(false);
    captcha.reset();
    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }

    if (signUp.session) {
      toast.success("Cadastro criado! Você já entrou no Clube.");
      navigate({ to: "/inicio" });
      return;
    }

    toast.success("Cadastro criado! Agora entre com seu e-mail e senha.");
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-2xl bg-mango/40 p-4 text-sm">
        <p className="font-bold">Versão de desenvolvimento</p>
        <p className="mt-1 text-muted-foreground">
          Por enquanto usamos e-mail e senha para testar sem custo de SMS. O acesso por telefone
          entra antes do piloto com clientes reais.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Só o essencial agora. Usuário, cidade e preferências você completa depois e ganha progresso
        no perfil.
      </p>
      <Field label="Como te chamamos?" error={errors.display_name}>
        <input
          name="display_name"
          required
          className={inputCls}
          placeholder="Seu nome ou apelido"
        />
      </Field>
      <Field label="E-mail" error={errors.email}>
        <input
          name="email"
          type="email"
          required
          className={inputCls}
          placeholder="voce@email.com"
        />
      </Field>
      <PasswordField
        label="Senha"
        name="password"
        show={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
        hint="Use 10+ caracteres, com letra e número."
        error={errors.password}
      />
      <PasswordField
        label="Confirmar senha"
        name="password_confirm"
        show={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
        error={errors.password_confirm}
      />
      <Field label="Nascimento" error={errors.birth_date}>
        <input name="birth_date" type="date" required className={inputCls} />
      </Field>

      <div className="space-y-2 rounded-2xl bg-muted p-4 text-sm">
        <Consent
          name="is_over_18"
          error={errors.is_over_18}
          label="Confirmo que tenho 18 anos ou mais."
        />
        <Consent
          name="accept_terms"
          error={errors.accept_terms}
          label="Li e aceito os Termos de Uso e a Política da Comunidade."
        />
        <Consent
          name="accept_privacy"
          error={errors.accept_privacy}
          label="Li e aceito a Política de Privacidade."
        />
        <Consent
          name="marketing_opt_in"
          label="(Opcional) Quero receber promoções e novidades do Bafafá."
        />
      </div>

      <TurnstileChallenge onToken={captcha.onToken} resetKey={captcha.resetKey} />
      {errors.captcha && <p className="text-xs font-semibold text-destructive">{errors.captcha}</p>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary py-3 text-base font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)] disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Entrar pro clube
      </button>
    </form>
  );
}

function Consent({ name, label, error }: { name: string; label: string; error?: string }) {
  return (
    <div>
      <label className="flex items-start gap-2">
        <input name={name} type="checkbox" className="mt-1 h-4 w-4 accent-primary" />
        <span className="text-sm">{label}</span>
      </label>
      {error && <span className="ml-6 block text-xs text-destructive">{error}</span>}
    </div>
  );
}

function SigninForm({ onForgot }: { onForgot: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const captcha = useAuthCaptcha();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (captcha.required && !captcha.token) {
      toast.error("Confirme o desafio de segurança.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: (fd.get("email") as string).trim(),
      password: fd.get("password") as string,
      options: { captchaToken: captcha.token ?? undefined },
    });
    setLoading(false);
    captcha.reset();
    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }
    const userId = data.user?.id;
    let needsSecurity = false;
    if (userId) {
      const [{ data: roles }, { data: aal }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      needsSecurity =
        isPrivilegedRole((roles ?? []).map((row) => row.role)) && aal?.currentLevel !== "aal2";
    }
    toast.success("Bem-vindo, Bafafã!");
    navigate({ to: needsSecurity ? "/seguranca" : "/inicio" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail">
        <input name="email" type="email" required className={inputCls} />
      </Field>
      <PasswordField
        label="Senha"
        name="password"
        show={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
      />
      <TurnstileChallenge onToken={captcha.onToken} resetKey={captcha.resetKey} />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary py-3 text-base font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)] disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
      </button>
      <button
        type="button"
        onClick={onForgot}
        className="w-full py-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
      >
        Esqueci minha senha
      </button>
    </form>
  );
}

function PasswordField({
  label,
  name,
  show,
  onToggle,
  hint,
  error,
}: {
  label: string;
  name: string;
  show: boolean;
  onToggle: () => void;
  hint?: string;
  error?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          className={`${inputCls} pr-12`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

function ResetForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const captcha = useAuthCaptcha();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();
    if (captcha.required && !captcha.token) return toast.error("Confirme o desafio de segurança.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken: captcha.token ?? undefined,
    });
    setLoading(false);
    captcha.reset();
    if (error) return toast.error(friendlyAuthError(error.message));
    toast.success("Se o e-mail existir, você vai receber um link em instantes.");
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Digita teu e-mail que a gente manda o link pra criar uma nova senha.
      </p>
      <Field label="E-mail">
        <input name="email" type="email" required className={inputCls} />
      </Field>
      <TurnstileChallenge onToken={captcha.onToken} resetKey={captcha.resetKey} />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary py-3 text-base font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)] disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enviar link
      </button>
    </form>
  );
}
