import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";

type SecureQrProps = {
  value: string;
  shortCode: string;
  secondsLeft: number;
  label?: string;
  dark?: boolean;
};

export function SecureQr({
  value,
  shortCode,
  secondsLeft,
  label = "Aponte a câmera da equipe",
  dark = false,
}: SecureQrProps) {
  const groups = shortCode.match(/.{1,3}/g)?.join(" ") ?? shortCode;
  return (
    <div
      className={`mx-auto w-full max-w-[270px] rounded-[28px] border-[3px] p-4 text-center shadow-[5px_6px_0_var(--foreground)] ${
        dark
          ? "border-mango bg-background text-foreground"
          : "border-foreground bg-white text-foreground"
      }`}
    >
      <div className="mx-auto grid w-fit place-items-center rounded-2xl bg-white p-3">
        <QRCodeSVG
          value={value}
          size={176}
          level="M"
          marginSize={1}
          bgColor="#ffffff"
          fgColor="#171126"
          title="QR Code temporário do Bafafá"
        />
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em]">
        <ShieldCheck className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-black tracking-[0.15em]">{groups}</p>
      <p className="mt-1 text-xs font-semibold opacity-65">
        Código temporário · expira em {secondsLeft}s
      </p>
    </div>
  );
}
