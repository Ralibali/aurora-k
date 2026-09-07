export type InvoiceBasisAssignment = {
 status?:string; invoiced?:boolean; actual_start:string|null; actual_stop:string|null;
 require_photo?:boolean|null; consignment_photo_url?:string|null;
 require_signature?:boolean|null; signature_url?:string|null;
 customer:{pricing_type:string|null;price_per_delivery:number|null;price_per_hour:number|null}|null;
};
export function invoiceReadiness(a:InvoiceBasisAssignment,openDeviations=0,deviationsAvailable=true) {
 const issues:string[]=[];let hours:number|null=null;let amount:number|null=null;
 if(a.actual_start&&a.actual_stop){const duration=(Date.parse(a.actual_stop)-Date.parse(a.actual_start))/3600000;if(Number.isFinite(duration)&&duration>=0)hours=duration;}
 if(a.status!=='completed')issues.push('Uppdraget är inte slutfört');
 if(a.require_photo&&!a.consignment_photo_url?.trim())issues.push('Leveransfoto saknas');
 if(a.require_signature&&!a.signature_url?.trim())issues.push('Underskrift saknas');
 if(!deviationsAvailable)issues.push('Avvikelser behöver kontrolleras');
 else if(openDeviations>0)issues.push(`${openDeviations} öppen${openDeviations===1?'':'a'} avvikelse${openDeviations===1?'':'r'}`);
 const c=a.customer;
 if(!c)issues.push('Kund saknas');
 else if(c.pricing_type==='per_delivery'){
  if(c.price_per_delivery!==null&&Number.isFinite(c.price_per_delivery)&&c.price_per_delivery>=0)amount=c.price_per_delivery;
  else issues.push('Pris per leverans saknas');
 }else if(c.pricing_type==='per_hour'){
  if(hours===null||hours<=0)issues.push('Giltig start- och sluttid saknas');
  if(c.price_per_hour===null||!Number.isFinite(c.price_per_hour)||c.price_per_hour<0)issues.push('Timpris saknas');
  else if(hours!==null&&hours>0)amount=Math.round(hours*c.price_per_hour*100)/100;
 }else issues.push('Prismodell saknas');
 return {hours,amount,issues,ready:!a.invoiced&&issues.length===0};
}
export function csvCell(value:unknown):string {
 let text=String(value??'');
 if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
