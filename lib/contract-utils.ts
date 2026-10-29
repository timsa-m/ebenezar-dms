import { formatCurrencyInWords } from "@/lib/number-to-words";

export interface ContractVehicleDetails {
  id: string;
  make: string;
  model: string;
  registrationNo: string;
  fuel: string;
  chassisNo: string;
  color: string;
  engineNo: string;
  ratingCC: string;
}

export interface ContractBuyerDetails {
  id: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  poBox: string;
  physicalAddress: string;
  occupation: string;
}

export interface ContractPaymentConditions {
  vehiclePrice: number;
  vehiclePriceWords: string;
  deposit: number;
  depositWords: string;
  balance: number;
  balanceWords: string;
}

export interface ContractInstallmentRow {
  number: number;
  date: string;
  amount: number;
}

export interface ContractSignatures {
  dateText: string;
  sellerName: string;
  buyerName: string;
  buyerIdNumber: string;
  buyerPhone: string;
  sellerWitnessName: string;
  sellerWitnessId: string;
  sellerWitnessPhone: string;
  buyerWitnessName: string;
  buyerWitnessId: string;
  buyerWitnessPhone: string;
}

export interface ContractData {
  id: string;
  contractNo: string;
  agreementDate: string;
  status: string;
  vehicle: ContractVehicleDetails;
  buyer: ContractBuyerDetails;
  payment: ContractPaymentConditions;
  installments: ContractInstallmentRow[];
  totalInstallmentsAmount: number;
  signatures: ContractSignatures;
  termsAndConditions: string[];
}

export const CONTRACT_TERMS_AND_CONDITIONS: string[] = [
  "The Vendor shall undertake all necessary actions to facilitate the seamless transfer of the motor vehicle's ownership, including the execution of all requisite documentation and instruments to obtain any necessary consents.",
  'The Purchaser acknowledges having inspected the motor vehicle and expresses satisfaction with its current state, thereby agreeing to acquire the vehicle on an "AS IS, WHERE IS" basis.',
  "Upon the execution of this Agreement, the Purchaser shall be responsible for securing an independent insurance policy; the Vendor shall be indemnified against any claims arising subsequent to the execution of this document.",
  "Should the Purchaser fail to remit any agreed-upon installment, a penalty equivalent to 20% of the said installment amount shall be applied.",
  "In the event of a second default on installment payments without justifiable cause, the Vendor reserves the right to repossess the motor vehicle or motorcycle without prior notice.",
  "The deposit paid by the Purchaser shall be deemed non-refundable. Furthermore, the Vendor retains the authority to sell the aforementioned motor vehicle to a third party.",
  "In the instance of repossession, all associated costs, including storage and recovery charges, shall be the sole liability of the Purchaser.",
  "The Purchaser assumes full responsibility for any loss or damage resulting from accidents, theft, or fire, regardless of whether the formal transfer of title has been completed.",
  "This Agreement is irrevocable; any party found in breach shall be liable for liquidated damages in an amount equal to 30% of the total sale value or consideration.",
];

export interface ContractSellerDetails {
  id?: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  poBox: string;
  physicalAddress: string;
  occupation: string;
}

export interface ContractPurchaserEntityDetails {
  companyName: string;
  representativeName: string;
  phone: string;
  poBox: string;
  address: string;
}

export interface ContractPurchasePaymentConditions {
  purchasePrice: number;
  purchasePriceWords: string;
  amountPaid: number;
  amountPaidWords: string;
  balance: number;
  balanceWords: string;
  paymentMethod: string;
}

export interface PurchaseContractSignatures {
  dateText: string;
  sellerName: string;
  sellerIdNumber: string;
  sellerPhone: string;
  purchaserRepresentative: string;
  purchaserPhone: string;
  sellerWitnessName: string;
  sellerWitnessId: string;
  sellerWitnessPhone: string;
  buyerWitnessName: string;
  buyerWitnessId: string;
  buyerWitnessPhone: string;
}

export interface PurchaseContractData {
  id: string;
  purchaseNo: string;
  agreementDate: string;
  vehicle: ContractVehicleDetails;
  seller: ContractSellerDetails;
  purchaser: ContractPurchaserEntityDetails;
  payment: ContractPurchasePaymentConditions;
  signatures: PurchaseContractSignatures;
  termsAndConditions: string[];
  specialNotes?: string;
  logbookHandedOver?: boolean;
  transferFormSigned?: boolean;
}

export const PURCHASE_TERMS_AND_CONDITIONS: string[] = [
  "The Vendor shall undertake all necessary actions to facilitate the seamless transfer of the motor vehicle's ownership, including the execution of all requisite documentation and instruments to obtain any necessary consents.",
  'The Purchaser acknowledges having inspected the motor vehicle and expresses satisfaction with its current state, thereby agreeing to acquire the vehicle on an "AS IS, WHERE IS" basis.',
  "Upon the execution of this Agreement, the Purchaser shall be responsible for securing an independent insurance policy; the Vendor shall be indemnified against any claims arising subsequent to the execution of this document.",
  "Should the Purchaser fail to remit any agreed-upon installment, a penalty equivalent to 20% of the said installment amount shall be applied.",
  "In the event of a second default on installment payments without justifiable cause, the Vendor reserves the right to repossess the motor vehicle or motorcycle without prior notice.",
  "The deposit paid by the Purchaser shall be deemed non-refundable. Furthermore, the Vendor retains the authority to sell the aforementioned motor vehicle to a third party.",
  "In the instance of repossession, all associated costs, including storage and recovery charges, shall be the sole liability of the Purchaser.",
  "The Purchaser assumes full responsibility for any loss or damage resulting from accidents, theft, or fire, regardless of whether the formal transfer of title has been completed.",
  "This Agreement is irrevocable; any party found in breach shall be liable for liquidated damages in an amount equal to 30% of the total sale value or consideration.",
];


export function parseMakeModel(makeModel: string | null | undefined, knownColor?: string | null): { make: string; model: string } {
  if (!makeModel || !makeModel.trim()) {
    return { make: "N/A", model: "N/A" };
  }

  let cleaned = makeModel.trim();
  // If prefix is color, remove it (e.g. "BEIGE TOYOTA HARRIER")
  if (knownColor && cleaned.toUpperCase().startsWith(knownColor.trim().toUpperCase())) {
    cleaned = cleaned.substring(knownColor.trim().length).trim();
  }

  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    return { make: parts[0].toUpperCase(), model: "-" };
  }

  return {
    make: parts[0].toUpperCase(),
    model: parts.slice(1).join(" ").toUpperCase(),
  };
}

export function formatDateKenya(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === "1970-01-01") {
    return new Date().toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function parseGuarantor(comment: string | null | undefined): { name: string; phone: string; id: string } {
  if (!comment) return { name: "", phone: "", id: "" };
  let name = "";
  let phone = "";
  let id = "";

  const nameMatch = comment.match(/GUARANTOR:\s*([^|\n]+)/i);
  if (nameMatch) name = nameMatch[1].trim().toUpperCase();

  const phoneMatch = comment.match(/PHONE:\s*([^|\n]+)/i);
  if (phoneMatch) phone = phoneMatch[1].trim();

  const idMatch = comment.match(/ID:\s*([^|\n]+)/i);
  if (idMatch) id = idMatch[1].trim();

  return { name, phone, id };
}

export function parseAddressAndPoBox(notes: string | null | undefined): { address: string; poBox: string } {
  if (!notes) return { address: "", poBox: "" };
  let address = notes.trim().toUpperCase();
  let poBox = "";

  const poBoxMatch = address.match(/(?:P\.?\s*O\.?\s*BOX|POST\s*OFFICE\s*BOX|P\s*BOX)\s*([A-Z0-9\s-]+)/i);
  if (poBoxMatch) {
    poBox = poBoxMatch[0].trim().toUpperCase();
  }

  return { address, poBox };
}
