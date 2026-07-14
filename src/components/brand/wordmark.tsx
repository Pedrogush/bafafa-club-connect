import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  variant?: "full" | "short";
  tone?: "primary" | "white" | "foreground";
}

/**
 * Marca temporária BAFAFÁ. A logo oficial vai substituir este componente
 * quando for enviada. Não alteramos o texto, escala nem cor da marca real;
 * este componente é apenas um wordmark provisório.
 */
export function Wordmark({ className, variant = "full", tone = "primary" }: WordmarkProps) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "white"
        ? "text-primary-foreground"
        : "text-foreground";
  return (
    <div className={cn("inline-flex flex-col items-start leading-none", className)}>
      <span className={cn("wordmark text-[2.4em]", toneClass)}>
        BAFAFÁ<span className="text-samba">.</span>
      </span>
      {variant === "full" && (
        <span className="mt-1 font-sans text-[0.7em] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Clube dos Bafafãs
        </span>
      )}
    </div>
  );
}
