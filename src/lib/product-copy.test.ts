import { expect, it } from 'vitest';
import { checkProductCopy } from '../../scripts/normalize-product-copy.mjs';
it('requires the monthly amount and VAT qualifier on the price page', () => {
 expect(()=>checkProductCopy('<p>449 kr per månad exkl. moms</p>',true)).not.toThrow();
 expect(()=>checkProductCopy('449 kr',true)).toThrow();
 expect(()=>checkProductCopy('exkl. moms',true)).toThrow();
});
it.each(['Setupavgift: 3 500 kr','En startavgift på 2 000 kr tillkommer.','Obligatorisk engångskostnad 100 kr'])('rejects mandatory setup copy: %s', text=>expect(()=>checkProductCopy(text)).toThrow());
it.each(['Ingen startavgift.','Utan setup-avgift.','Valfri uppstartshjälp: 3 500 kr exkl. moms på förfrågan via kontaktformuläret.'])('allows approved copy: %s',text=>expect(()=>checkProductCopy(text)).not.toThrow());
