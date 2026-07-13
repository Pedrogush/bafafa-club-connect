import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";

export const Route = createFileRoute("/_authenticated/carteira")({
  component: () => (
    <AppShell>
      <ScreenHeader eyebrow="Seus mimos" title="Carteira" />
      <div className="mx-5 card-festa bg-lagoa p-6 text-lagoa-foreground">
        <p className="font-display text-xl leading-tight">Carteirinha em fase de bordado.</p>
        <p className="mt-2 text-sm">
          Benefícios, QR de resgate e histórico chegam na Etapa 2. Fica de olho.
        </p>
      </div>
    </AppShell>
  ),
});
