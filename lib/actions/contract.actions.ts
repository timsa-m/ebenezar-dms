"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { formatCurrencyInWords } from "@/lib/number-to-words";
import { revalidatePath } from "next/cache";
import {
  type ContractData,
  type ContractVehicleDetails,
  type ContractBuyerDetails,
  type ContractPaymentConditions,
  type ContractInstallmentRow,
  type ContractSignatures,
  CONTRACT_TERMS_AND_CONDITIONS,
  parseMakeModel,
  formatDateKenya,
  parseGuarantor,
  parseAddressAndPoBox,
} from "@/lib/contract-utils";

export async function getContractData(agreementId: string): Promise<ContractData | null> {
  try {
    const supabase = createAdminClient();

    // 1. Fetch financing agreement with joined client and vehicle
    const { data: ag, error } = await supabase
      .from("financing_agreements")
      .select(`
        *,
        client:clients(id, full_name, phone, client_id_number, email, notes),
        vehicle:vehicles(id, registration_no, make_model, sale_price, year, color, mileage, engine_capacity, transmission, fuel_type, chassis_no, engine_no)
      `)
      .eq("id", agreementId)
      .maybeSingle();

    if (error || !ag) {
      console.error("[getContractData] Agreement fetch error:", error);
      return null;
    }

    // 2. Fetch installments
    const { data: dbInstallments } = await supabase
      .from("financing_installments")
      .select("*")
      .eq("agreement_id", ag.id)
      .order("installment_number", { ascending: true });

    // 3. Process Vehicle Details
    const veh = ag.vehicle || {};
    const { make, model } = parseMakeModel(veh.make_model, veh.color);

    const vehicleDetails: ContractVehicleDetails = {
      id: veh.id || ag.vehicle_id,
      make: make || "N/A",
      model: model || "N/A",
      registrationNo: (veh.registration_no || "N/A").toUpperCase(),
      fuel: (veh.fuel_type || "PETROL").toUpperCase(),
      chassisNo: (veh.chassis_no || "").toUpperCase(),
      color: (veh.color || "").toUpperCase(),
      engineNo: (veh.engine_no || "").toUpperCase(),
      ratingCC: (veh.engine_capacity || "").toUpperCase(),
    };

    // 4. Process Buyer Details
    const client = ag.client || {};
    const { address, poBox } = parseAddressAndPoBox(client.notes);

    const buyerDetails: ContractBuyerDetails = {
      id: client.id || ag.client_id,
      fullName: (client.full_name || "N/A").toUpperCase(),
      idNumber: client.client_id_number || "N/A",
      phoneNumber: client.phone || "N/A",
      poBox: poBox || "",
      physicalAddress: address || "",
      occupation: "BUSINESS",
    };

    // 5. Process Payment Conditions
    const salePrice = Number(ag.sale_price) || 0;
    const depositPaid = Number(ag.deposit_paid) || 0;
    
    // The contract's payment balance should be the fixed initial balance (vehicle price minus deposit)
    // before any scheduled payments are made, rather than the running balance (ag.balance).
    const fixedInitialBalance = Math.max(0, salePrice - depositPaid);

    const payment: ContractPaymentConditions = {
      vehiclePrice: salePrice,
      vehiclePriceWords: formatCurrencyInWords(salePrice),
      deposit: depositPaid,
      depositWords: formatCurrencyInWords(depositPaid),
      balance: fixedInitialBalance,
      balanceWords: formatCurrencyInWords(fixedInitialBalance),
    };

    // 6. Process Installments
    let installments: ContractInstallmentRow[] = [];

    if (dbInstallments && dbInstallments.length > 0) {
      installments = dbInstallments.map((inst: any) => ({
        number: inst.installment_number,
        date: formatDateKenya(inst.due_date),
        amount: Number(inst.principal_due) || Number(inst.amount_due) || 0,
      }));
    } else if (fixedInitialBalance > 0) {
      // Auto-project schedule if not stored in DB
      const count = Number(ag.duration_months) || (ag.monthly_due ? Math.ceil(fixedInitialBalance / ag.monthly_due) : 12) || 12;
      const monthlyAmount = ag.monthly_due ? Number(ag.monthly_due) : Math.round(fixedInitialBalance / count);
      const startDate = ag.start_date && ag.start_date !== "1970-01-01" ? new Date(ag.start_date) : new Date();

      let allocatedSum = 0;
      for (let i = 1; i <= count; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        let rowAmt = monthlyAmount;
        if (i === count) {
          rowAmt = fixedInitialBalance - allocatedSum;
        } else {
          allocatedSum += rowAmt;
        }

        installments.push({
          number: i,
          date: formatDateKenya(dueDate.toISOString().split("T")[0]),
          amount: Math.max(0, rowAmt),
        });
      }
    }

    const totalInstallmentsAmount = installments.reduce((sum, item) => sum + item.amount, 0) || fixedInitialBalance;

    // 7. Process Signatures
    const guarantor = parseGuarantor(ag.comment);
    const dateText = formatDateKenya(ag.start_date);

    const signatures: ContractSignatures = {
      dateText: dateText,
      sellerName: "EBENEZAR ENTERPRISES CAR BAZAAR",
      buyerName: buyerDetails.fullName,
      buyerIdNumber: buyerDetails.idNumber,
      buyerPhone: buyerDetails.phoneNumber,
      sellerWitnessName: "",
      sellerWitnessId: "",
      sellerWitnessPhone: "",
      buyerWitnessName: guarantor.name || "",
      buyerWitnessId: guarantor.id || "",
      buyerWitnessPhone: guarantor.phone || "",
    };

    return {
      id: ag.id,
      contractNo: ag.contract_no,
      agreementDate: dateText,
      status: ag.status,
      vehicle: vehicleDetails,
      buyer: buyerDetails,
      payment,
      installments,
      totalInstallmentsAmount,
      signatures,
      termsAndConditions: CONTRACT_TERMS_AND_CONDITIONS,
    };
  } catch (err) {
    console.error("[getContractData] Error:", err);
    return null;
  }
}

export async function updateVehicleContractDetails(params: {
  vehicleId: string;
  chassisNo?: string;
  engineNo?: string;
  color?: string;
  fuelType?: string;
  engineCapacity?: string;
  makeModel?: string;
}) {
  try {
    const supabase = createAdminClient();
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (params.chassisNo !== undefined) updateData.chassis_no = params.chassisNo.trim().toUpperCase();
    if (params.engineNo !== undefined) updateData.engine_no = params.engineNo.trim().toUpperCase();
    if (params.color !== undefined) updateData.color = params.color.trim().toUpperCase();
    if (params.fuelType !== undefined) updateData.fuel_type = params.fuelType.trim();
    if (params.engineCapacity !== undefined) updateData.engine_capacity = params.engineCapacity.trim();
    if (params.makeModel !== undefined) updateData.make_model = params.makeModel.trim().toUpperCase();

    const { error } = await supabase
      .from("vehicles")
      .update(updateData)
      .eq("id", params.vehicleId);

    if (error) throw error;

    revalidatePath("/loans", "layout");
    revalidatePath("/admin/contracts", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("[updateVehicleContractDetails] Error:", err);
    return { success: false, error: err?.message || "Failed to update vehicle details" };
  }
}
