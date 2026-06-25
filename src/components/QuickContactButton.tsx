import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { LeadFormModal } from "./LeadFormModal";
import { cn } from "@/lib/utils";

export function QuickContactButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Kontakta oss"
        className={cn(
          "fixed bottom-5 right-5 z-40 hidden items-center gap-2 rounded-full sm:flex",
          "bg-primary text-primary-foreground shadow-lg",
          "px-5 py-3 text-sm font-medium",
          "transition-all hover:bg-primary-hover hover:shadow-xl hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <MessageCircle className="h-5 w-5" />
        <span>Kontakta oss</span>
      </button>
      <LeadFormModal open={open} onOpenChange={setOpen} />
    </>
  );
}
