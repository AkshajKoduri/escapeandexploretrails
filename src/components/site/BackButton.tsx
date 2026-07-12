import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = {
  to?: string;
  label?: string;
  className?: string;
};

export default function BackButton({ to = "/", label = "Back", className = "" }: Props) {
  const navigate = useNavigate();
  return (
    <div className={`container pt-24 md:pt-28 ${className}`}>
      <button
        type="button"
        onClick={() => (to ? navigate(to) : navigate(-1))}
        className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-card border border-border text-primary text-sm font-semibold shadow-card hover:bg-muted transition-colors"
        aria-label={label}
      >
        <ArrowLeft className="w-4 h-4" /> {label}
      </button>
    </div>
  );
}
