type LocalCustomer = {
  name: string;
  org_number?: string | null;
  email?: string | null;
  phone?: string | null;
  invoice_address?: string | null;
  contact_person?: string | null;
  payment_terms_days?: number | null;
};

type LocalInvoice = {
  invoice_date: string;
  due_date: string;
  reference?: string | null;
  message?: string | null;
  total_ex_vat?: number | null;
  vat_amount?: number | null;
  total_inc_vat?: number | null;
};

type LocalLine = {
  description: string;
  quantity: number;
  unit?: string | null;
  unit_price?: number | null;
  unitPrice?: number | null;
  vat_rate?: number | null;
  vatRate?: number | null;
};

export function fortnoxCustomerPayload(customer: LocalCustomer) {
  return {
    Customer: {
      Name: customer.name,
      OrganisationNumber: customer.org_number || undefined,
      Email: customer.email || undefined,
      Phone1: customer.phone || undefined,
      Address1: customer.invoice_address || undefined,
      YourReference: customer.contact_person || undefined,
      TermsOfPayment: customer.payment_terms_days ? String(customer.payment_terms_days) : undefined,
    },
  };
}

export function fortnoxInvoicePayload(invoice: LocalInvoice, customerNumber: string, lines: LocalLine[]) {
  const rows = lines.length ? lines.map(line => ({
    Description: line.description,
    DeliveredQuantity: Number(line.quantity),
    Unit: line.unit || 'st',
    Price: Number(line.unit_price ?? line.unitPrice ?? 0),
    VAT: Number(line.vat_rate ?? line.vatRate ?? 25),
  })) : [{
    Description: invoice.message || 'Transporttjänst',
    DeliveredQuantity: 1,
    Unit: 'st',
    Price: Number(invoice.total_ex_vat ?? 0),
    VAT: Number(invoice.total_ex_vat) > 0 ? Math.round(Number(invoice.vat_amount ?? 0) / Number(invoice.total_ex_vat) * 100) : 25,
  }];

  return {
    Invoice: {
      CustomerNumber: customerNumber,
      InvoiceDate: invoice.invoice_date,
      DueDate: invoice.due_date,
      YourReference: invoice.reference || undefined,
      Remarks: invoice.message || undefined,
      InvoiceRows: rows,
    },
  };
}
