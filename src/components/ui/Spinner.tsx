import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={20} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0F1117]">
      <Spinner className="text-accent" />
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
      <Spinner />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
