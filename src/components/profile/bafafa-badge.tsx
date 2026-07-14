import type { ComponentType } from "react";
import {
  BadgeCheck,
  CalendarCheck2,
  Crown,
  Music2,
  PartyPopper,
  Sparkles,
  Star,
  UserCheck,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BafafaBadgeDefinition = {
  slug?: string | null;
  name: string;
  description?: string | null;
  icon?: string | null;
};

const ICONS: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "badge-check": BadgeCheck,
  "user-check": UserCheck,
  "party-popper": PartyPopper,
  "calendar-check": CalendarCheck2,
  music: Music2,
  utensils: UtensilsCrossed,
  users: UsersRound,
  crown: Crown,
  sparkles: Sparkles,
};

const BADGE_STYLES: Record<string, string> = {
  "bafafa-fundador": "bg-mango text-foreground border-foreground shadow-[3px_3px_0_var(--foreground)]",
  "bafafã-verificado": "bg-lagoa text-lagoa-foreground border-foreground",
  "perfil-no-grau": "bg-primary text-primary-foreground border-foreground",
  "primeiro-bafafa": "bg-samba text-samba-foreground border-foreground",
  "presenca-confirmada": "bg-secondary text-secondary-foreground border-foreground",
  "nao-perde-um-pagode": "bg-electric text-white border-foreground",
  "sobreviveu-feijoada": "bg-brick text-white border-foreground",
  "trouxe-resenha": "bg-mint text-foreground border-foreground",
};

function iconFor(definition: BafafaBadgeDefinition) {
  return ICONS[definition.icon ?? ""] ?? Star;
}

function styleFor(definition: BafafaBadgeDefinition) {
  return BADGE_STYLES[definition.slug ?? ""] ?? "bg-card text-foreground border-foreground";
}

export function CompactBadgeMark({
  badge,
  className,
  showLabel = false,
}: {
  badge: BafafaBadgeDefinition;
  className?: string;
  showLabel?: boolean;
}) {
  const Icon = iconFor(badge);
  const founder = badge.slug === "bafafa-fundador";
  return (
    <span
      title={`${badge.name}${badge.description ? ` — ${badge.description}` : ""}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1 border-2 font-extrabold uppercase",
        showLabel ? "rounded-full px-2 py-1 text-[9px] tracking-[0.08em]" : "h-7 w-7 rounded-full",
        styleFor(badge),
        founder && "rotate-[-4deg]",
        className,
      )}
      aria-label={badge.name}
    >
      <Icon className={showLabel ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2.5} />
      {showLabel && <span>{badge.name}</span>}
    </span>
  );
}

export function BadgeSticker({
  badge,
  locked = false,
  className,
}: {
  badge: BafafaBadgeDefinition;
  locked?: boolean;
  className?: string;
}) {
  const Icon = iconFor(badge);
  const founder = badge.slug === "bafafa-fundador";
  return (
    <div className={cn("group text-center", className)}>
      <div
        className={cn(
          "relative mx-auto grid h-20 w-20 place-items-center rounded-full border-[3px] transition-transform group-hover:-rotate-2 group-hover:scale-[1.03]",
          locked
            ? "border-border bg-muted text-muted-foreground grayscale"
            : styleFor(badge),
          founder && !locked && "h-22 w-22 ring-4 ring-mango/25",
        )}
      >
        <Icon className="h-9 w-9" strokeWidth={2.3} />
        {!locked && (
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-foreground bg-background text-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="mt-2 text-xs font-black leading-tight">{badge.name}</p>
      {badge.description && (
        <p className="mx-auto mt-1 max-w-32 text-[10px] leading-snug text-muted-foreground">
          {badge.description}
        </p>
      )}
    </div>
  );
}

export function NameWithBadges({
  name,
  badges,
  className,
}: {
  name: string;
  badges: BafafaBadgeDefinition[];
  className?: string;
}) {
  const sorted = [...badges].sort((a, b) => {
    if (a.slug === "bafafa-fundador") return -1;
    if (b.slug === "bafafa-fundador") return 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}>
      <span className="min-w-0 truncate">{name}</span>
      <span className="inline-flex items-center -space-x-1">
        {sorted.slice(0, 3).map((badge) => (
          <CompactBadgeMark key={`${badge.slug}-${badge.name}`} badge={badge} />
        ))}
      </span>
      {sorted.length > 3 && (
        <span className="rounded-full border border-foreground/20 bg-background px-1.5 py-0.5 text-[9px] font-black">
          +{sorted.length - 3}
        </span>
      )}
    </div>
  );
}
