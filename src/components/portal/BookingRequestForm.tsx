import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, Loader2, CheckCircle2, Inbox } from 'lucide-react';
import { toast } from 'sonner';

interface BookingRequestFormProps {
  token: string;
  bookings: any[];
  onCreated: (booking: any) => void;
}

const statusLabels: Record<string, string> = {
  pending: 'Ny',
  accepted: 'Accepterad',
  rejected: 'Avvisad',
};

export function BookingRequestForm({ token, bookings, onCreated }: BookingRequestFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/customer-portal?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            preferred_date: preferredDate || undefined,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Kunde inte skicka förfrågan');
      }

      const { booking } = await res.json();
      onCreated(booking);
      setTitle('');
      setDescription('');
      setPreferredDate('');
      setSubmitted(true);
      toast.success('Förfrågan skickad!');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Något gick fel');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ny förfrågan</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-primary" />
              <p className="font-medium">Tack! Din förfrågan har skickats.</p>
              <p className="text-sm text-muted-foreground mt-1">Vi återkommer så snart som möjligt.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="booking-title">Titel *</Label>
                <Input
                  id="booking-title"
                  placeholder="T.ex. Transport Göteborg–Stockholm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-desc">Beskrivning</Label>
                <Textarea
                  id="booking-desc"
                  placeholder="Beskriv vad ni behöver hjälp med..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-date">Önskat datum</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={submitting || !title.trim()} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Skicka förfrågan
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tidigare förfrågningar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Inga tidigare förfrågningar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Önskat datum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell>{b.preferred_date || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === 'accepted' ? 'secondary' : b.status === 'rejected' ? 'destructive' : 'outline'}>
                        {statusLabels[b.status] || b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
