import { LineItem, TaxBreakdown, TaxRateType } from '../types/document';

export function calculateLineItem(
  item: Omit<LineItem, 'total' | 'taxAmount' | 'taxableAmount'>
): LineItem {
  const lineGross = Math.max(0, item.qty * item.price - (item.discount || 0));
  
  let rate = 0;
  if (item.taxType.includes('16%')) rate = 0.16;
  else if (item.taxType.includes('8%')) rate = 0.08;
  else rate = 0.00;

  let taxable = 0;
  let tax = 0;

  if (rate > 0) {
    taxable = Number((lineGross / (1 + rate)).toFixed(2));
    tax = Number((lineGross - taxable).toFixed(2));
  } else {
    taxable = Number(lineGross.toFixed(2));
    tax = 0;
  }

  return {
    ...item,
    total: Number(lineGross.toFixed(2)),
    taxableAmount: taxable,
    taxAmount: tax,
  };
}

export function calculateDocumentTotals(items: LineItem[]) {
  const calculatedItems = items.map(calculateLineItem);

  let totalAmount = 0;
  let subtotal = 0;
  let totalVat = 0;
  let totalDiscount = 0;

  const breakdownMap: Record<TaxRateType, { taxable: number; vat: number; rate: number }> = {
    'B VAT 16%': { taxable: 0, vat: 0, rate: 0.16 },
    'C VAT 8%': { taxable: 0, vat: 0, rate: 0.08 },
    'A Exempt': { taxable: 0, vat: 0, rate: 0.00 },
    'E Zero Rated': { taxable: 0, vat: 0, rate: 0.00 },
  };

  calculatedItems.forEach(item => {
    totalAmount += item.total;
    subtotal += item.taxableAmount;
    totalVat += item.taxAmount;
    totalDiscount += (item.discount || 0);

    const key = item.taxType;
    if (!breakdownMap[key]) {
      breakdownMap[key] = { taxable: 0, vat: 0, rate: item.taxRate / 100 };
    }
    breakdownMap[key].taxable += item.taxableAmount;
    breakdownMap[key].vat += item.taxAmount;
  });

  const taxBreakdowns: TaxBreakdown[] = Object.entries(breakdownMap)
    .filter(([_, data]) => data.taxable > 0 || data.vat > 0)
    .map(([rateKey, data]) => ({
      rate: rateKey as TaxRateType,
      taxRate: data.rate * 100,
      taxableAmount: Number(data.taxable.toFixed(2)),
      vatAmount: Number(data.vat.toFixed(2)),
    }));

  // If no taxable items, keep at least one row
  if (taxBreakdowns.length === 0) {
    taxBreakdowns.push({
      rate: 'B VAT 16%',
      taxRate: 16,
      taxableAmount: 0,
      vatAmount: 0,
    });
  }

  return {
    items: calculatedItems,
    subtotal: Number(subtotal.toFixed(2)),
    totalVat: Number(totalVat.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    taxBreakdowns,
  };
}

export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
