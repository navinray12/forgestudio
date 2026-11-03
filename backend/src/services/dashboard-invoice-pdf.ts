// A download of the stored invoice record; never creates an invoice or changes payment status.
export function generateInvoicePdf(invoice: any): Buffer {
  const safe = (value: unknown) => String(value).replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&');
  const date = (value: string) => new Date(value).toISOString().slice(0, 10);
  const lines = [
    'FORGESTUDIO - INVOICE', `Invoice: ${invoice.invoiceNumber}`, `Date: ${date(invoice.createdAt)}`,
    `Billing period: ${date(invoice.billingPeriodStart)} to ${date(invoice.billingPeriodEnd)}`,
    `Amount: ${invoice.currency} ${Number(invoice.amount).toFixed(2)}`, `Status: ${invoice.status}`,
    'This document reflects the stored billing record.',
  ];
  const stream = `BT /F1 12 Tf 50 780 Td 22 TL ${lines.map((line, index) => `${index ? 'T* ' : ''}(${safe(line)}) Tj`).join('\n')} ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let result = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(result)); result += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(result);
  result += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(result);
}
