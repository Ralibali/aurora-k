import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PUBLIC_SITE_URL } from '@/lib/constants';

export function CustomerStatusLink({ token }: { token: string }) {
  const url = `${PUBLIC_SITE_URL}/track/${token}`;
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success('Kundlänken kopierades');
  };
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => void copy()}><Copy className="mr-1 h-4 w-4" /> Kopiera kundlänk</Button>
      <Button size="icon" asChild><a href={url} target="_blank" rel="noreferrer" aria-label="Öppna kundstatus"><ExternalLink className="h-4 w-4" /></a></Button>
    </div>
  );
}
