import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";

export const Route = createFileRoute("/_authenticated/fofoquinhas")({
  component: () => (
    <AppShell>
      <ScreenHeader eyebrow="Feed do clube" title="Fofoquinhas" />
      <EmptyStub title="A gente tentou guardar segredo. Tentou." copy="O feed abre na Etapa 2 — vem com reações, comentários e enquetes." />
    </AppShell>
  ),
});

function EmptyStub({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="mx-5 card-festa bg-mango p-6 text-mango-foreground">
      <p className="font-display text-xl leading-tight">{title}</p>
      <p className="mt-2 text-sm">{copy}</p>
    </div>
  );
}
