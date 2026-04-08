import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LeadForm } from './LeadForm';

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadFormModal({ open, onOpenChange }: LeadFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Intresserad av Aurora Transport?</DialogTitle>
          <DialogDescription>
            Fyll i formuläret så kontaktar vi dig för en personlig genomgång.
          </DialogDescription>
        </DialogHeader>
        <LeadForm compact onSuccess={() => {}} />
      </DialogContent>
    </Dialog>
  );
}
