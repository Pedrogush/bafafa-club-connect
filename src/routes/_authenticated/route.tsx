import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Gate autenticado. `ssr: false` porque a sessão do Supabase vive no
 * localStorage do navegador — o servidor não consegue ler. O redirect vai
 * para /auth quando não há sessão.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
