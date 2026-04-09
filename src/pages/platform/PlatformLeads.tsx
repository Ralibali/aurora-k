import { useState } from 'react';
import { PlatformLayout } from '@/components/PlatformAdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollableTable } from '@/components/ScrollableTable';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Search, Building2, Mail, Phone, Truck, Hash, MessageSquare, UserPlus, ExternalLink, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new: { label: 'Ny', variant: 'default' },
  contacted: { label: 'Kontaktad', variant: 'secondary' },
  converted: { label: 'Konverterad', variant: 'outline' },
  rejected: { label: 'Avvisad', variant: 'destructive' },
};

const fallbackStatus = { label: 'Okänd', variant: 'secondary' as const };

export default function PlatformLeads() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertCompanyName, setConvertCompanyName] = useState('');
  const [convertOrgNr, setConvertOrgNr] = useState('');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['platform-leads'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('leads') as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; admin_notes?: string }) => {
      const { error } = await (supabase.from('leads') as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-leads'] });
      toast.success('Lead uppdaterad');
    },
    onError: () => toast.error('Kunde inte uppdatera'),
  });

  const handleConvert = async () => {
    if (!selectedLead || !convertCompanyName.trim()) {
      toast.error('Företagsnamn krävs');
      return;
    }

    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: convertCompanyName.trim(),
        org_nr: convertOrgNr.trim() || null,
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (companyError) {
      toast.error('Kunde inte skapa företag: ' + companyError.message);
      return;
    }

    // Create settings for the company
    await supabase.from('settings').insert({
      company_id: company.id,
      company_name: convertCompanyName.trim(),
    });

    // Mark lead as converted
    await (supabase.from('leads') as any)
      .update({ status: 'converted', admin_notes: (selectedLead.admin_notes || '') + `\nKonverterad till företag ${company.id}` })
      .eq('id', selectedLead.id);

    queryClient.invalidateQueries({ queryKey: ['platform-leads'] });
    queryClient.invalidateQueries({ queryKey: ['platform-companies'] });
    setConvertOpen(false);
    setSelectedLead(null);
    toast.success(`Företag "${convertCompanyName}" skapat! Du kan nu bjuda in ägaren under Företag-fliken.`);
  };

  const filtered = leads.filter((lead: any) => {
    const matchSearch = !search || [lead.company_name, lead.contact_person, lead.email, lead.phone]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: leads.length,
    new: leads.filter((l: any) => l.status === 'new').length,
    contacted: leads.filter((l: any) => l.status === 'contacted').length,
    converted: leads.filter((l: any) => l.status === 'converted').length,
  };

  return (
    <PlatformLayout title="Leads" description="Intresseanmälningar från potentiella kunder">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Totalt', value: counts.total, color: 'text-foreground' },
          { label: 'Nya', value: counts.new, color: 'text-blue-600' },
          { label: 'Kontaktade', value: counts.contacted, color: 'text-amber-600' },
          { label: 'Konverterade', value: counts.converted, color: 'text-emerald-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök företag, namn, e-post..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla statusar</SelectItem>
            <SelectItem value="new">Nya</SelectItem>
            <SelectItem value="contacted">Kontaktade</SelectItem>
            <SelectItem value="converted">Konverterade</SelectItem>
            <SelectItem value="rejected">Avvisade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Building2} title="Inga leads" description="Det finns inga intresseanmälningar ännu." />
      ) : (
        <ScrollableTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Företag</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Storlek</TableHead>
                <TableHead>Poäng</TableHead>
                <TableHead>Källa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead: any) => {
                const s = statusMap[lead.status] || fallbackStatus;
                return (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLead(lead)}>
                    <TableCell className="font-medium">{lead.company_name}</TableCell>
                    <TableCell>{lead.contact_person}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.phone || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.fleet_size || '—'}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{lead.lead_score ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{lead.utm_source || '—'}</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {format(new Date(lead.created_at), 'd MMM yyyy', { locale: sv })}
                    </TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollableTable>
      )}

      {/* Lead detail dialog */}
      <Dialog open={!!selectedLead && !convertOpen} onOpenChange={(open) => !open && setSelectedLead(null)}>
        {selectedLead && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {selectedLead.company_name}
              </DialogTitle>
              <DialogDescription>Lead från {format(new Date(selectedLead.created_at), 'd MMMM yyyy HH:mm', { locale: sv })}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
                </div>
                {selectedLead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">{selectedLead.phone}</a>
                  </div>
                )}
                {selectedLead.org_number && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedLead.org_number}</span>
                  </div>
                )}
                {selectedLead.fleet_size && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedLead.fleet_size}</span>
                  </div>
                )}
              </div>

              {selectedLead.message && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Meddelande
                  </p>
                  <p className="text-sm text-foreground">{selectedLead.message}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm">Status</Label>
                <Select
                  value={selectedLead.status}
                  onValueChange={(val) => {
                    updateLead.mutate({ id: selectedLead.id, status: val });
                    setSelectedLead({ ...selectedLead, status: val });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Ny</SelectItem>
                    <SelectItem value="contacted">Kontaktad</SelectItem>
                    <SelectItem value="converted">Konverterad</SelectItem>
                    <SelectItem value="rejected">Avvisad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Admin-anteckning</Label>
                <Textarea
                  defaultValue={selectedLead.admin_notes || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (selectedLead.admin_notes || '')) {
                      updateLead.mutate({ id: selectedLead.id, admin_notes: e.target.value });
                    }
                  }}
                  rows={2}
                  placeholder="Interna anteckningar..."
                />
              </div>

              {selectedLead.status !== 'converted' && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setConvertCompanyName(selectedLead.company_name);
                    setConvertOrgNr(selectedLead.org_number || '');
                    setConvertOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Skapa företag & onboarda
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Convert dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skapa nytt företag</DialogTitle>
            <DialogDescription>
              Företaget skapas med 14 dagars provperiod. Du kan sedan bjuda in ägaren via Företag-fliken.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Företagsnamn</Label>
              <Input value={convertCompanyName} onChange={(e) => setConvertCompanyName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Org.nummer (valfritt)</Label>
              <Input value={convertOrgNr} onChange={(e) => setConvertOrgNr(e.target.value)} placeholder="556000-0000" />
            </div>
            <Button className="w-full" onClick={handleConvert}>
              <Building2 className="h-4 w-4 mr-2" />
              Skapa företag
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}
