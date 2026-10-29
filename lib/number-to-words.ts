/**
 * Convert integer amounts into Kenyan English words (uppercase).
 * e.g. 450000 -> "FOUR HUNDRED AND FIFTY THOUSAND"
 * formatCurrencyInWords(450000) -> "(*in words FOUR HUNDRED AND FIFTY THOUSAND KENYAN SHILLINGS ONLY*)"
 */

const ONES = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
];

const TENS = [
  "",
  "",
  "TWENTY",
  "THIRTY",
  "FORTY",
  "FIFTY",
  "SIXTY",
  "SEVENTY",
  "EIGHTY",
  "NINETY",
];

function convertLessThanThousand(num: number): string {
  if (num === 0) return "";

  let result = "";

  if (num >= 100) {
    result += ONES[Math.floor(num / 100)] + " HUNDRED";
    num %= 100;
    if (num > 0) {
      result += " AND ";
    }
  }

  if (num >= 20) {
    result += TENS[Math.floor(num / 10)];
    if (num % 10 > 0) {
      result += " " + ONES[num % 10];
    }
  } else if (num > 0) {
    result += ONES[num];
  }

  return result.trim();
}

export function numberToWords(amount: number): string {
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return "ZERO";

  const billions = Math.floor(num / 1_000_000_000);
  const millions = Math.floor((num % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((num % 1_000_000) / 1_000);
  const remainder = num % 1_000;

  const parts: string[] = [];

  if (billions > 0) {
    parts.push(convertLessThanThousand(billions) + " BILLION");
  }

  if (millions > 0) {
    parts.push(convertLessThanThousand(millions) + " MILLION");
  }

  if (thousands > 0) {
    parts.push(convertLessThanThousand(thousands) + " THOUSAND");
  }

  if (remainder > 0) {
    if (parts.length > 0 && remainder < 100) {
      parts.push("AND " + convertLessThanThousand(remainder));
    } else {
      parts.push(convertLessThanThousand(remainder));
    }
  }

  return parts.join(" ").trim();
}

export function formatCurrencyInWords(amount: number): string {
  const words = numberToWords(amount);
  return `(*in words ${words} KENYAN SHILLINGS ONLY*)`;
}
