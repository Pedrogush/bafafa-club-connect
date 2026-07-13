import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "visitante" | "gratuito" | "premium" | "equipe" | "moderador" | "admin";

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  roles: AppRole[];
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
    roles: [],
  });

  useEffect(() => {
    let mounted = true;

    async function loadRoles(userId: string): Promise<AppRole[]> {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      return (data ?? []).map((r) => r.role as AppRole);
    }

    // Sync listener first, then bootstrap the current session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) {
        // Defer to avoid deadlock w/ auth callback
        setTimeout(() => {
          if (!mounted) return;
          loadRoles(session.user!.id).then((roles) => {
            if (mounted) setState((s) => ({ ...s, roles, loading: false }));
          });
        }, 0);
      } else {
        setState((s) => ({ ...s, roles: [], loading: false }));
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const roles = await loadRoles(session.user.id);
        if (mounted) setState({ loading: false, session, user: session.user, roles });
      } else {
        setState({ loading: false, session: null, user: null, roles: [] });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function hasRole(roles: AppRole[], ...target: AppRole[]) {
  return roles.some((r) => target.includes(r));
}
