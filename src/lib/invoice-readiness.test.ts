import {describe,it,expect} from 'vitest';
import {invoiceReadiness,csvCell,type InvoiceBasisAssignment} from './invoice-readiness';
const base:InvoiceBasisAssignment={status:'completed',invoiced:false,actual_start:'2026-09-07T08:00:00Z',actual_stop:'2026-09-07T10:30:00Z',customer:{pricing_type:'per_hour',price_per_hour:500,price_per_delivery:null}};
describe('invoice readiness',()=>{
 it('calculates known hourly prices and requires review of zero-price deliveries',()=>{expect(invoiceReadiness(base)).toMatchObject({hours:2.5,amount:1250,ready:true});expect(invoiceReadiness({...base,customer:{pricing_type:'per_delivery',price_per_delivery:0,price_per_hour:null}}).ready).toBe(false);});
 it('does not turn missing prices or time into a billable zero',()=>{expect(invoiceReadiness({...base,customer:null})).toMatchObject({amount:null,ready:false});expect(invoiceReadiness({...base,actual_stop:null})).toMatchObject({amount:null,ready:false});expect(invoiceReadiness({...base,actual_stop:'2026-09-07T07:00:00Z'}).ready).toBe(false);});
 it('uses an agreed positive fixed invoice amount before the customer tariff',()=>{expect(invoiceReadiness({...base,cost:900,actual_start:null,actual_stop:null})).toMatchObject({amount:900,ready:true});expect(invoiceReadiness({...base,cost:0}).amount).toBe(1250);expect(invoiceReadiness({...base,cost:-1}).ready).toBe(false);});
 it('holds open deviations and failed checks',()=>{expect(invoiceReadiness(base,1).ready).toBe(false);expect(invoiceReadiness(base,0,false).ready).toBe(false);});
 it('requires mandated delivery proof and prevents double invoicing',()=>{expect(invoiceReadiness({...base,require_photo:true}).ready).toBe(false);expect(invoiceReadiness({...base,require_signature:true}).ready).toBe(false);expect(invoiceReadiness({...base,invoiced:true}).ready).toBe(false);expect(invoiceReadiness({...base,require_photo:true,consignment_photo_url:'https://example.test/proof.jpg'}).ready).toBe(true);});
});
describe('CSV text',()=>{
 it('quotes cells, escapes quotes and neutralizes spreadsheet formulas',()=>{expect(csvCell('A;B "C"')).toBe('"A;B ""C"""');for(const value of ['=HYPERLINK("evil")',' +1','\t@SUM(A1)','-1+2'])expect(csvCell(value)).toMatch(/^"'/);expect(csvCell(1250)).toBe('"1250"');});
});
