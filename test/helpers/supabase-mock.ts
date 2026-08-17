import { vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/hooks/use-auth";

/**
 * Dublê do cliente Supabase.
 *
 * O cliente real (`src/integrations/supabase/client.ts`) é um Proxy preguiçoso
 * que estoura se as variáveis de ambiente não existirem. Nos testes trocamos o
 * módulo inteiro por este dublê, que só implementa o que os guards de rota e as
 * libs realmente usam: `auth.getUser`, `auth.mfa.getAuthenticatorAssuranceLevel`,
 * `from(...).select(...).eq(...)` e `rpc(...)`.
 */

export type SupabaseMockOptions = {
  /** Usuário devolvido por `auth.getUser()`. `null` simula sessão ausente. */
  user?: User | null;
  /** Papéis devolvidos pela consulta a `user_roles`. */
  roles?: AppRole[];
  /** Nível de garantia atual da sessão (AAL1 = só senha, AAL2 = senha + 2FA). */
  assuranceLevel?: "aal1" | "aal2";
  /** Respostas de RPC por nome, quando o teste precisar. */
  rpcResponses?: Record<string, { data?: unknown; error?: unknown }>;
};

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: "teste@bafafa.test",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}

export function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const { user = makeUser(), roles = [], assuranceLevel = "aal1", rpcResponses = {} } = options;

  const roleRows = roles.map((role) => ({ role }));

  // `from("user_roles").select("role").eq("user_id", id)` é "thenable":
  // o código de produção faz `Promise.resolve(query)`, então o objeto
  // devolvido pelo `.eq()` precisa se comportar como uma promise.
  const selectResult = {
    data: roleRows,
    error: null as unknown,
  };

  const eq = vi.fn(() => ({
    then: (resolve: (value: typeof selectResult) => unknown) =>
      Promise.resolve(resolve(selectResult)),
  }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  const getAuthenticatorAssuranceLevel = vi.fn(async () => ({
    data: { currentLevel: assuranceLevel, nextLevel: assuranceLevel },
    error: null,
  }));

  const getUser = vi.fn(async () =>
    user ? { data: { user }, error: null } : { data: { user: null }, error: null },
  );

  const rpc = vi.fn(async (name: string) => {
    const configured = rpcResponses[name];
    return { data: configured?.data ?? null, error: configured?.error ?? null };
  });

  const supabase = {
    from,
    rpc,
    auth: {
      getUser,
      mfa: { getAuthenticatorAssuranceLevel },
    },
  };

  return { supabase, spies: { from, select, eq, rpc, getUser, getAuthenticatorAssuranceLevel } };
}
