import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";

export const Route = createFileRoute("/_authenticated/reservas")({
  component: () => (
    <AppShell>
      <ScreenHeader eyebrow="Sua mesa" title="Reservas" />
      <div className="mx-5 card-festa bg-secondary p-6 text-secondary-foreground">
        <p className="font-display text-xl leading-tight">Sua mesa está quase garantida.</p>
        <p className="mt-2 text-sm">
          O fluxo de reserva com evento, área, sinal e QR Code entra na Etapa 2.
        </p>
      </div>
    </AppShell>
  ),
});
