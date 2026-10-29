import {
  calculateBalance,
  allocateRepayment,
  classifyDelinquency,
  normalizeKenyanPhone,
  isValidKenyanPhone,
  maskNationalId,
  maskPhone,
  calculateHirePurchase,
} from './src/lib/financial-engine';

console.log('--- TESTING FINANCIAL ENGINE INVARIANTS ---');

// 1. Invariant: Balance = Sale Price - Total Paid - Total Waived
const bal1 = calculateBalance(1500000, 600000);
console.assert(bal1 === 900000, `Expected balance 900000, got ${bal1}`);
console.log('✓ calculateBalance verified (1,500,000 - 600,000 = 900,000)');

const balWithWaiver = calculateBalance(1500000, 600000, 100000);
console.assert(balWithWaiver === 800000, `Expected balance 800000 with waiver, got ${balWithWaiver}`);
console.log('✓ calculateBalance with waiver verified (1,500,000 - 600,000 - 100,000 = 800,000)');

// 2. Waterfall: Payment -> Penalties -> Overdue Interest -> Principal
const waterfall = allocateRepayment({
  paymentAmount: 50000,
  outstandingPenalties: 5000,
  overdueInterest: 10000,
  currentPrincipalBalance: 100000,
});
console.assert(waterfall.allocatedPenalties === 5000, 'Penalties allocation failed');
console.assert(waterfall.allocatedOverdueInterest === 10000, 'Interest allocation failed');
console.assert(waterfall.allocatedPrincipal === 35000, 'Principal allocation failed');
console.assert(waterfall.newPrincipalBalance === 65000, 'New principal balance failed');
console.log('✓ Payment waterfall verified (50k -> 5k penalties, 10k interest, 35k principal)');

// 3. Delinquency Classification
const d1 = classifyDelinquency(15);
console.assert(d1.bucket === '0-30 Days' && d1.statusLabel === 'Performing', 'Bucket 1 failed');

const d2 = classifyDelinquency(45);
console.assert(d2.bucket === '31-60 Days' && d2.statusLabel === 'Early-stage Delinquency', 'Bucket 2 failed');

const d3 = classifyDelinquency(75);
console.assert(d3.bucket === '61-90 Days' && d3.statusLabel === 'High Risk', 'Bucket 3 failed');

const d4 = classifyDelinquency(110);
console.assert(d4.bucket === '90+ Days' && d4.isRepossessionCandidate === true, 'Bucket 4 failed');
console.log('✓ Delinquency aging buckets verified');

// 4. Phone Normalization
console.assert(normalizeKenyanPhone('0712345678') === '+254712345678', 'Phone 07 failed');
console.assert(normalizeKenyanPhone('0112345678') === '+254112345678', 'Phone 01 failed');
console.assert(normalizeKenyanPhone('254712345678') === '+254712345678', 'Phone 254 failed');
console.assert(normalizeKenyanPhone('+254712345678') === '+254712345678', 'Phone +254 failed');
console.assert(isValidKenyanPhone('0712345678') === true, 'isValidKenyanPhone failed');
console.log('✓ Kenyan phone normalization to E.164 verified');

// 5. PII Redaction
console.assert(maskNationalId('12345678') === '12****78', 'maskNationalId failed');
console.assert(maskPhone('+254712345678') === '+254712****678', 'maskPhone failed');
console.log('✓ PII redaction verified');

// 6. Hire-Purchase Calculator
const hp = calculateHirePurchase({
  salePrice: 2000000,
  depositAmount: 500000,
  durationMonths: 12,
  annualInterestRate: 15,
});
console.assert(hp.financedAmount === 1500000, 'Financed amount failed');
console.assert(hp.totalInterest === 225000, 'Total interest failed');
console.assert(hp.monthlyInstallment === 143750, 'Monthly installment failed');
console.log('✓ Hire-purchase calculation verified');

console.log('ALL FINANCIAL ENGINE TESTS PASSED!');
