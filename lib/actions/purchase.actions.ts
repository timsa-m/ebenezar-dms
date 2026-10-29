"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { formatCurrencyInWords } from "@/lib/number-to-words";
import { revalidatePath } from "next/cache";
import {
  type PurchaseContractData,
  type ContractVehicleDetails,
  type ContractSellerDetails,
  type ContractPurchaserEntityDetails,
  type ContractPurchasePaymentConditions,
  type PurchaseContractSignatures,
  PURCHASE_TERMS_AND_CONDITIONS,
  parseMakeModel,
  formatDateKenya,
} from "@/lib/contract-utils";

export interface RecordVehiclePurchaseParams {
  vehicleId: string;
  sellerName: string;
  sellerIdNumber: string;
  sellerPhone: string;
  sellerAddress?: string;
  sellerPoBox?: string;
  sellerOccupation?: string;
  purchasePrice: number;
  amountPaid?: number;
  balance?: number;
  paymentMethod?: string;
  purchaseDate?: string;
  sellerWitnessName?: string;
  sellerWitnessId?: string;
  sellerWitnessPhone?: string;
  buyerWitnessName?: string;
  buyerWitnessId?: string;
  buyerWitnessPhone?: string;
  specialNotes?: string;
  logbookHandedOver?: boolean;
  transferFormSigned?: boolean;
}

/**
 * Record a vehicle purchase transaction and store seller details
 */
export async function recordVehiclePurchase(params: RecordVehiclePurchaseParams) {
  try {
    const supabase = createAdminClient();
    const purchaseDate = params.purchaseDate || new Date().toISOString().split("T")[0];
    const amountPaid = params.amountPaid ?? params.purchasePrice;
    const balance = params.balance ?? Math.max(0, params.purchasePrice - amountPaid);
    const purchaseNo = `PUR-${Date.now().toString().slice(-6)}`;

    // 1. Insert into vehicle_purchases table
    const { data: purchaseData, error: purchaseError } = await supabase
      .from("vehicle_purchases")
      .insert({
        vehicle_id: params.vehicleId,
        purchase_no: purchaseNo,
        seller_name: params.sellerName.trim().toUpperCase(),
        seller_id_number: params.sellerIdNumber.trim().toUpperCase(),
        seller_phone: params.sellerPhone.trim(),
        seller_address: params.sellerAddress?.trim().toUpperCase() || null,
        seller_po_box: params.sellerPoBox?.trim().toUpperCase() || null,
        seller_occupation: params.sellerOccupation?.trim().toUpperCase() || "BUSINESS",
        purchase_price: Number(params.purchasePrice) || 0,
        amount_paid: Number(amountPaid) || 0,
        balance: Number(balance) || 0,
        payment_method: params.paymentMethod || "Bank Transfer",
        purchase_date: purchaseDate,
        seller_witness_name: params.sellerWitnessName?.trim().toUpperCase() || null,
        seller_witness_id: params.sellerWitnessId?.trim().toUpperCase() || null,
        seller_witness_phone: params.sellerWitnessPhone?.trim() || null,
        buyer_witness_name: params.buyerWitnessName?.trim().toUpperCase() || "GEORGE DOLA ANDERE",
        buyer_witness_id: params.buyerWitnessId?.trim() || "0722263192",
        buyer_witness_phone: params.buyerWitnessPhone?.trim() || "+254722263192",
        special_notes: params.specialNotes || null,
        logbook_handed_over: params.logbookHandedOver ?? true,
        transfer_form_signed: params.transferFormSigned ?? true,
      })
      .select()
      .maybeSingle();

    if (purchaseError) {
      console.warn("[recordVehiclePurchase] Warning writing to vehicle_purchases:", purchaseError.message);
    }

    // 2. Also update seller details on vehicles record directly
    try {
      await supabase
        .from("vehicles")
        .update({
          purchase_price: Number(params.purchasePrice) || 0,
          date_purchased: purchaseDate,
          seller_name: params.sellerName.trim().toUpperCase(),
          seller_id_number: params.sellerIdNumber.trim().toUpperCase(),
          seller_phone: params.sellerPhone.trim(),
          seller_address: params.sellerAddress?.trim().toUpperCase() || null,
          seller_po_box: params.sellerPoBox?.trim().toUpperCase() || null,
          purchase_id: purchaseData?.id || null,
        })
        .eq("id", params.vehicleId);
    } catch (vehUpdateErr) {
      console.warn("[recordVehiclePurchase] Note on updating vehicles columns:", vehUpdateErr);
    }

    revalidatePath("/", "layout");

    return {
      success: true,
      purchaseId: purchaseData?.id || null,
      purchaseNo,
    };
  } catch (err: any) {
    console.error("[recordVehiclePurchase] Error:", err);
    return { success: false, error: err?.message || "Failed to record purchase details." };
  }
}

/**
 * Fetch Purchase Contract Data for viewing / printing / editing
 */
export async function getPurchaseContractData(vehicleIdOrPurchaseId: string): Promise<PurchaseContractData | null> {
  try {
    const supabase = createAdminClient();

    // 1. Try to find by vehicle_purchases id or vehicle_id
    let purchaseRecord: any = null;
    const { data: purchaseById } = await supabase
      .from("vehicle_purchases")
      .select("*, vehicle:vehicles(*)")
      .eq("id", vehicleIdOrPurchaseId)
      .maybeSingle();

    if (purchaseById) {
      purchaseRecord = purchaseById;
    } else {
      const { data: purchaseByVehicle } = await supabase
        .from("vehicle_purchases")
        .select("*, vehicle:vehicles(*)")
        .eq("vehicle_id", vehicleIdOrPurchaseId)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (purchaseByVehicle) {
        purchaseRecord = purchaseByVehicle;
      }
    }

    // 2. Fetch vehicle details
    let vehicleData = purchaseRecord?.vehicle;
    if (!vehicleData) {
      const { data: directVehicle } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleIdOrPurchaseId)
        .maybeSingle();

      if (directVehicle) {
        vehicleData = directVehicle;
      }
    }

    if (!vehicleData) {
      console.error("[getPurchaseContractData] Vehicle not found for id:", vehicleIdOrPurchaseId);
      return null;
    }

    // 3. Process Vehicle Details
    const { make, model } = parseMakeModel(vehicleData.make_model, vehicleData.color);

    const vehicle: ContractVehicleDetails = {
      id: vehicleData.id,
      make: make || "N/A",
      model: model || "N/A",
      registrationNo: (vehicleData.registration_no || "N/A").toUpperCase(),
      fuel: (vehicleData.fuel_type || "PETROL").toUpperCase(),
      chassisNo: (vehicleData.chassis_no || "").toUpperCase(),
      color: (vehicleData.color || "").toUpperCase(),
      engineNo: (vehicleData.engine_no || "").toUpperCase(),
      ratingCC: (vehicleData.engine_capacity || "").toUpperCase(),
    };

    // 4. Process Seller Details
    const seller: ContractSellerDetails = {
      id: purchaseRecord?.id || undefined,
      fullName: (purchaseRecord?.seller_name || vehicleData.seller_name || "").toUpperCase(),
      idNumber: purchaseRecord?.seller_id_number || vehicleData.seller_id_number || "",
      phoneNumber: purchaseRecord?.seller_phone || vehicleData.seller_phone || "",
      poBox: purchaseRecord?.seller_po_box || vehicleData.seller_po_box || "",
      physicalAddress: purchaseRecord?.seller_address || vehicleData.seller_address || "",
      occupation: purchaseRecord?.seller_occupation || "BUSINESS",
    };

    // 5. Fetch Company Settings for Purchaser
    let companySettings: any = null;
    try {
      const { data: cs } = await supabase.from("company_settings").select("*").maybeSingle();
      companySettings = cs;
    } catch {
      // Fallback
    }

    const purchaser: ContractPurchaserEntityDetails = {
      companyName: companySettings?.company_name || "EBENEZAR ENT. CAR BAZAAR",
      representativeName: "GEORGE DOLA ANDERE",
      phone: companySettings?.primary_phone || "0722263192",
      poBox: "P.O. BOX 3547 - 40100",
      address: companySettings?.physical_address || "PATEL’S, ONDIEK HIGHWAY, KISUMU",
    };

    // 6. Payment conditions
    const purchasePrice = Number(purchaseRecord?.purchase_price ?? vehicleData.purchase_price ?? 0);
    const amountPaid = Number(purchaseRecord?.amount_paid ?? purchasePrice);
    const balance = Number(purchaseRecord?.balance ?? Math.max(0, purchasePrice - amountPaid));

    const payment: ContractPurchasePaymentConditions = {
      purchasePrice,
      purchasePriceWords: formatCurrencyInWords(purchasePrice),
      amountPaid,
      amountPaidWords: formatCurrencyInWords(amountPaid),
      balance,
      balanceWords: formatCurrencyInWords(balance),
      paymentMethod: purchaseRecord?.payment_method || "Bank Transfer",
    };

    // 7. Signatures
    const dateFormatted = formatDateKenya(purchaseRecord?.purchase_date || vehicleData.date_purchased || vehicleData.created_at);

    const signatures: PurchaseContractSignatures = {
      dateText: dateFormatted,
      sellerName: seller.fullName,
      sellerIdNumber: seller.idNumber,
      sellerPhone: seller.phoneNumber,
      purchaserRepresentative: purchaser.representativeName,
      purchaserPhone: purchaser.phone,
      sellerWitnessName: purchaseRecord?.seller_witness_name || "",
      sellerWitnessId: purchaseRecord?.seller_witness_id || "",
      sellerWitnessPhone: purchaseRecord?.seller_witness_phone || "",
      buyerWitnessName: purchaseRecord?.buyer_witness_name || "GEORGE DOLA ANDERE",
      buyerWitnessId: purchaseRecord?.buyer_witness_id || "0722263192",
      buyerWitnessPhone: purchaseRecord?.buyer_witness_phone || "+254722263192",
    };

    return {
      id: purchaseRecord?.id || vehicleData.id,
      purchaseNo: purchaseRecord?.purchase_no || `PUR-${vehicleData.registration_no || "VEH"}`,
      agreementDate: dateFormatted,
      vehicle,
      seller,
      purchaser,
      payment,
      signatures,
      termsAndConditions: PURCHASE_TERMS_AND_CONDITIONS,
      specialNotes: purchaseRecord?.special_notes || "",
      logbookHandedOver: purchaseRecord?.logbook_handed_over ?? true,
      transferFormSigned: purchaseRecord?.transfer_form_signed ?? true,
    };
  } catch (err: any) {
    console.error("[getPurchaseContractData] Error:", err);
    return null;
  }
}

/**
 * Update Purchase Contract Details from inline edit
 */
export async function updatePurchaseContractDetails(params: {
  vehicleId: string;
  purchaseId?: string;
  makeModel: string;
  chassisNo: string;
  engineNo: string;
  color: string;
  fuelType: string;
  engineCapacity: string;
  sellerName: string;
  sellerIdNumber: string;
  sellerPhone: string;
  sellerAddress?: string;
  sellerPoBox?: string;
  sellerOccupation?: string;
  purchasePrice: number;
  amountPaid: number;
  balance: number;
  specialNotes?: string;
  sellerWitnessName?: string;
  sellerWitnessId?: string;
  sellerWitnessPhone?: string;
  buyerWitnessName?: string;
  buyerWitnessId?: string;
  buyerWitnessPhone?: string;
}) {
  try {
    const supabase = createAdminClient();

    // 1. Update vehicle record
    await supabase
      .from("vehicles")
      .update({
        make_model: params.makeModel.trim(),
        chassis_no: params.chassisNo.trim().toUpperCase(),
        engine_no: params.engineNo.trim().toUpperCase(),
        color: params.color.trim().toUpperCase(),
        fuel_type: params.fuelType.trim(),
        engine_capacity: params.engineCapacity.trim(),
        purchase_price: Number(params.purchasePrice) || 0,
        seller_name: params.sellerName.trim().toUpperCase(),
        seller_id_number: params.sellerIdNumber.trim().toUpperCase(),
        seller_phone: params.sellerPhone.trim(),
        seller_address: params.sellerAddress?.trim().toUpperCase() || null,
        seller_po_box: params.sellerPoBox?.trim().toUpperCase() || null,
      })
      .eq("id", params.vehicleId);

    // 2. Update vehicle_purchases record if it exists
    if (params.purchaseId) {
      await supabase
        .from("vehicle_purchases")
        .update({
          seller_name: params.sellerName.trim().toUpperCase(),
          seller_id_number: params.sellerIdNumber.trim().toUpperCase(),
          seller_phone: params.sellerPhone.trim(),
          seller_address: params.sellerAddress?.trim().toUpperCase() || null,
          seller_po_box: params.sellerPoBox?.trim().toUpperCase() || null,
          seller_occupation: params.sellerOccupation?.trim().toUpperCase() || "BUSINESS",
          purchase_price: Number(params.purchasePrice) || 0,
          amount_paid: Number(params.amountPaid) || 0,
          balance: Number(params.balance) || 0,
          special_notes: params.specialNotes || null,
          seller_witness_name: params.sellerWitnessName?.trim().toUpperCase() || null,
          seller_witness_id: params.sellerWitnessId?.trim().toUpperCase() || null,
          seller_witness_phone: params.sellerWitnessPhone?.trim() || null,
          buyer_witness_name: params.buyerWitnessName?.trim().toUpperCase() || null,
          buyer_witness_id: params.buyerWitnessId?.trim() || null,
          buyer_witness_phone: params.buyerWitnessPhone?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.purchaseId);
    } else {
      // If purchase record didn't exist yet, insert one now!
      await recordVehiclePurchase({
        vehicleId: params.vehicleId,
        sellerName: params.sellerName,
        sellerIdNumber: params.sellerIdNumber,
        sellerPhone: params.sellerPhone,
        sellerAddress: params.sellerAddress,
        sellerPoBox: params.sellerPoBox,
        sellerOccupation: params.sellerOccupation,
        purchasePrice: params.purchasePrice,
        amountPaid: params.amountPaid,
        balance: params.balance,
        specialNotes: params.specialNotes,
        sellerWitnessName: params.sellerWitnessName,
        sellerWitnessId: params.sellerWitnessId,
        sellerWitnessPhone: params.sellerWitnessPhone,
        buyerWitnessName: params.buyerWitnessName,
        buyerWitnessId: params.buyerWitnessId,
        buyerWitnessPhone: params.buyerWitnessPhone,
      });
    }

    revalidatePath("/", "layout");

    return { success: true };
  } catch (err: any) {
    console.error("[updatePurchaseContractDetails] Error:", err);
    return { success: false, error: err?.message || "Failed to update purchase contract details." };
  }
}

/**
 * Get all purchase contracts for the contracts ledger / reports
 */
export async function getAllVehiclePurchases() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("vehicle_purchases")
      .select("*, vehicle:vehicles(id, registration_no, make_model, color, year)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[getAllVehiclePurchases] Error:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("[getAllVehiclePurchases] Error:", err);
    return [];
  }
}
