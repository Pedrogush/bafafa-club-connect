import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/brand/wordmark";
import { Loader2 } from "lucide-react";

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
    password: z.string().min(8, "Mínimo 8 caracteres."),
    birth_date: z.string().min(10, "Data de nascimento obrigatória."),
    accept_terms: z.literal(true, { errorMap: () => ({ message: "Precisa aceitar os termos." }) }),
    accept_privacy: z.literal(true, {
      errorMap: () => ({ message: "Precisa aceitar a política de privacidade." }),
    }),
    is_over_18: z.literal(true, { errorMap: () => ({ message: "Só maiores de 18 anos." }) }),
    marketing_opt_in: z.boolean().optional().default(false),
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
    <div className="mx-auto min-h-screen max-w-lg bg-background px-5 py-8">
      <Link to="/" className="inline-block">
        <Wordmark variant="short" />
      </Link>
      <div className="mt-6 flex rounded-full bg-muted p-1 text-sm font-semibold">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full px-3 py-2 transition ${
              mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {m === "signin" ? "Entrar" : "Criar cadastro"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {mode === "signup" && <SignupForm onDone={() => setMode("signin")} />}
        {mode === "signin" && <SigninForm onForgot={() => setMode("reset")} />}
        {mode === "reset" && <ResetForm onDone={() => setMode("signin")} />}
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
  "w-full rounded-2xl border border-input bg-surface px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15";

function SignupForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const raw = {
      display_name: fd.get("display_name") as string,
      email: fd.get("email") as string,
      password: fd.get("password") as string,
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
    setLoading(true);
    const { data: signUp, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/inicio`,
        data: {
          display_name: data.display_name,
          birth_date: data.birth_date,
          is_over_18: true,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already") ? "E-mail já cadastrado." : error.message);
      return;
    }

    if (signUp.user) {
      const consents = [
        { kind: "termos", accepted: true },
        { kind: "privacidade", accepted: true },
        { kind: "comunidade", accepted: true },
        { kind: "maioridade", accepted: true },
        { kind: "marketing", accepted: data.marketing_opt_in },
      ].map((consent) => ({ ...consent, user_id: signUp.user!.id }));
      await supabase.from("user_consents").insert(consents);
      await supabase.from("user_preferences").upsert({
        user_id: signUp.user.id,
        marketing_opt_in: data.marketing_opt_in,
      });
    }

    toast.success("Cadastro criado! Se pedir confirmação por e-mail, dá uma olhadinha lá.");
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
      <Field label="Senha" hint="Pelo menos 8 caracteres." error={errors.password}>
        <input name="password" type="password" required className={inputCls} />
      </Field>
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

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-base font-bold text-primary-foreground shadow-festa disabled:opacity-60"
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
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: (fd.get("email") as string).trim(),
      password: fd.get("password") as string,
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "E-mail ou senha não bateram."
          : error.message,
      );
      return;
    }
    toast.success("Bem-vindo, Bafafã!");
    navigate({ to: "/inicio" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail">
        <input name="email" type="email" required className={inputCls} />
      </Field>
      <Field label="Senha">
        <input name="password" type="password" required className={inputCls} />
      </Field>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-base font-bold text-primary-foreground shadow-festa disabled:opacity-60"
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

function ResetForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
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
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-base font-bold text-primary-foreground shadow-festa disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enviar link
      </button>
    </form>
  );
}
