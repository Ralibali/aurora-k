import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NewInvoicePage from './NewInvoicePage';
import type { PersistedInvoiceLine } from '@/lib/invoice-lines';

const mocks = vi.hoisted(() => ({ customers: vi.fn(), assignments: vi.fn(), articles: vi.fn(), prices: vi.fn(), refetch: vi.fn(), loadArticles: vi.fn(), mutate: vi.fn() }));
vi.mock('@/components/AdminLayout', () => ({ AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/useData', () => ({ useCustomers: mocks.customers, useAssignments: mocks.assignments, useNextInvoiceNumber: () => ({ data: 1005, isSuccess: true }), useSettings: () => ({ data: { invoice_mode: 'invoice' }, isSuccess: true }) }));
vi.mock('@/hooks/useNewFeatures', () => ({ useArticles: mocks.articles, useCustomerPriceList: mocks.prices }));
vi.mock('@/hooks/useInvoiceTransactions', () => ({ useCreateReliableInvoice: () => ({ mutate: mocks.mutate, isPending: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: mocks.loadArticles }) }) } }));
vi.mock('./InvoiceLineEditor', () => ({ InvoiceLineEditor: ({ lines, onChange }: { lines: PersistedInvoiceLine[]; onChange: (lines: PersistedInvoiceLine[]) => void }) => <div>{lines.map(line => <div key={line.id}><span>{line.description}: {line.unitPrice}</span><button onClick={() => onChange(lines.filter(item => item.id !== line.id))}>Ta bort {line.description}</button></div>)}<button onClick={() => onChange([...lines, { id: 'manual', source: 'manual', description: 'Manuellt tillägg', quantity: 1, unit: 'st', unitPrice: 100, vatRate: 25, amount: 100 }])}>Lägg till fri rad</button></div> }));
const customer = { id: 'c1', name: 'Testkund', pricing_type: 'per_delivery', price_per_delivery: 500, price_per_hour: null, payment_terms_days: 30 };
const assignments = ['a1', 'a2'].map((id, index) => ({ id, title: `Transport ${index + 1}`, customer_id: 'c1', status: 'completed', invoiced: false, cost: null, actual_start: null, actual_stop: null, driver: null }));
const ready = <T,>(data: T) => ({ data, isSuccess: true, isError: false, refetch: mocks.refetch });
const view = () => <StrictMode><MemoryRouter initialEntries={['/admin/invoices/new?customer=c1&assignments=a1']}><NewInvoicePage /></MemoryRouter></StrictMode>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.customers.mockReturnValue(ready([customer]));
  mocks.assignments.mockReturnValue(ready(assignments));
  mocks.articles.mockReturnValue(ready([{ id: 'article1', default_price: 300 }]));
  mocks.prices.mockReturnValue(ready([{ article_id: 'article1', price: 250 }]));
  mocks.loadArticles.mockResolvedValue({ data: [], error: null });
});

describe('invoice source preparation lifecycle', () => {
  it('waits for customer, catalog and customer prices before freezing URL-selected article rows', async () => {
    mocks.customers.mockReturnValue({ data: undefined, isSuccess: false });
    const rendered = render(view());
    expect(mocks.loadArticles).not.toHaveBeenCalled();
    mocks.customers.mockReturnValue(ready([customer]));
    mocks.articles.mockReturnValue({ data: undefined, isSuccess: false });
    rendered.rerender(view());
    expect(mocks.loadArticles).not.toHaveBeenCalled();
    mocks.articles.mockReturnValue(ready([{ id: 'article1', default_price: 300 }]));
    mocks.prices.mockReturnValue({ data: undefined, isSuccess: false });
    rendered.rerender(view());
    expect(mocks.loadArticles).not.toHaveBeenCalled();
    mocks.prices.mockReturnValue(ready([{ article_id: 'article1', price: 250 }]));
    mocks.loadArticles.mockResolvedValue({ data: [{ id: 'source1', article_id: 'article1', name: 'Pall', quantity: 2, unit: 'st', unit_price: 99, vat_rate: 25 }], error: null });
    rendered.rerender(view());
    await screen.findByText('Pall: 250');
    expect(mocks.loadArticles).toHaveBeenCalledTimes(1);
  });
  it('offers retry after price-query and source-article failures without silently creating fallback rows', async () => {
    mocks.prices.mockReturnValue({ isSuccess: false, isError: true, refetch: mocks.refetch });
    const rendered = render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Försök läsa uppgifterna igen' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.loadArticles).not.toHaveBeenCalled();
    mocks.prices.mockReturnValue(ready([]));
    mocks.loadArticles.mockResolvedValueOnce({ data: null, error: new Error('Artiklar kunde inte läsas') });
    rendered.rerender(view());
    await screen.findByText('Artiklar kunde inte läsas');
    expect(screen.queryByText('Transport 1 — leverans: 500')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Försök skapa rader igen' }));
    await screen.findByText('Transport 1 — leverans: 500');
  });
  it('ignores a late source response after the selection changes', async () => {
    let resolveOld!: (value: { data: never[]; error: null }) => void;
    mocks.loadArticles.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    render(view());
    await waitFor(() => expect(mocks.loadArticles).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Föregående steg' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Välj Transport 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Välj Transport 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skapa fakturarader' }));
    await screen.findByText('Transport 2 — leverans: 500');
    await act(async () => { resolveOld({ data: [], error: null }); });
    expect(screen.queryByText('Transport 1 — leverans: 500')).not.toBeInTheDocument();
  });
  it('retains manual rows when revisiting selection and restores deleted source rows before preview', async () => {
    render(view());
    await screen.findByText('Transport 1 — leverans: 500');
    fireEvent.click(screen.getByRole('button', { name: 'Lägg till fri rad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Föregående steg' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fortsätt till fakturarader' }));
    expect(screen.getByText('Manuellt tillägg: 100')).toBeInTheDocument();
    expect(mocks.loadArticles).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ta bort Transport 1 — leverans' }));
    expect(screen.getByRole('button', { name: 'Förhandsgranska' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Återställ borttagna uppdragsrader' }));
    expect(screen.getByText('Manuellt tillägg: 100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Förhandsgranska' })).toBeEnabled();
  });
});
