import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase parses the recovery hash automatically; wait for a session.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setReady(true); // still allow attempt; UI will handle errors
    });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    if (password.length < 8) return toast.error("Mínimo 8 caracteres.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada. Bora!");
    navigate({ to: "/inicio" });
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background px-5 py-8">
      <Wordmark variant="short" />
      <h1 className="mt-8 font-display text-2xl">Nova senha, novo bafafá.</h1>
      {!ready ? (
        <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Senha nova</span>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-2xl border border-input bg-surface px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-primary-foreground shadow-festa disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </form>
      )}
    </div>
  );
}
