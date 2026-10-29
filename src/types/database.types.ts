export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VehicleStatus = 'in_stock' | 'reserved' | 'financed' | 'repossessed' | 'cash_sale' | 'deleted';
export type AgreementStatus = 'active' | 'completed' | 'defaulted' | 'repossessed' | 'terminated';
export type AgingBucket = '0-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';
export type PaymentMethod = 'mpesa' | 'bank_transfer' | 'cash' | 'cheque';
export type VehicleCostType = 'mechanical' | 'bodywork' | 'tracking' | 'detailing' | 'legal' | 'import_duty' | 'other';
export type LeadInterestType = 'hire_purchase' | 'cash_purchase' | 'trade_in' | 'general_inquiry';
export type LeadStatus = 'new' | 'contacted' | 'test_drive_scheduled' | 'converted' | 'lost';

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          client_id_number: string;
          full_name: string;
          phone: string;
          email: string | null;
          conflict_flag: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id_number: string;
          full_name: string;
          phone: string;
          email?: string | null;
          conflict_flag?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id_number?: string;
          full_name?: string;
          phone?: string;
          email?: string | null;
          conflict_flag?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          registration_no: string;
          make_model: string;
          type: string | null;
          year: number | null;
          color: string | null;
          mileage: number | null;
          engine_capacity: string | null;
          chassis_no: string | null;
          engine_no: string | null;
          transmission: string | null;
          fuel_type: string | null;
          purchase_price: number;
          base_price: number;
          sale_price: number;
          status: VehicleStatus;
          is_published: boolean;
          images: string[] | null;
          features: string[] | null;
          description: string | null;
          condition: string | null;
          hire_price: number | null;
          hire_price_weekly: number | null;
          for_hire: boolean | null;
          is_new_arrival: boolean | null;
          slug: string | null;
          seller_name: string | null;
          seller_id_number: string | null;
          seller_phone: string | null;
          seller_address: string | null;
          seller_po_box: string | null;
          purchase_id: string | null;
          date_purchased: string | null;
          date_sold: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration_no: string;
          make_model: string;
          type?: string | null;
          year?: number | null;
          color?: string | null;
          mileage?: number | null;
          engine_capacity?: string | null;
          chassis_no?: string | null;
          engine_no?: string | null;
          transmission?: string | null;
          fuel_type?: string | null;
          purchase_price?: number;
          base_price?: number;
          sale_price: number;
          status?: VehicleStatus;
          is_published?: boolean;
          images?: string[] | null;
          features?: string[] | null;
          description?: string | null;
          condition?: string | null;
          hire_price?: number | null;
          hire_price_weekly?: number | null;
          for_hire?: boolean | null;
          is_new_arrival?: boolean | null;
          slug?: string | null;
          seller_name?: string | null;
          seller_id_number?: string | null;
          seller_phone?: string | null;
          seller_address?: string | null;
          seller_po_box?: string | null;
          purchase_id?: string | null;
          date_purchased?: string | null;
          date_sold?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_no?: string;
          make_model?: string;
          type?: string | null;
          year?: number | null;
          color?: string | null;
          mileage?: number | null;
          engine_capacity?: string | null;
          chassis_no?: string | null;
          engine_no?: string | null;
          transmission?: string | null;
          fuel_type?: string | null;
          purchase_price?: number;
          base_price?: number;
          sale_price?: number;
          status?: VehicleStatus;
          is_published?: boolean;
          images?: string[] | null;
          features?: string[] | null;
          description?: string | null;
          condition?: string | null;
          hire_price?: number | null;
          hire_price_weekly?: number | null;
          for_hire?: boolean | null;
          is_new_arrival?: boolean | null;
          slug?: string | null;
          seller_name?: string | null;
          seller_id_number?: string | null;
          seller_phone?: string | null;
          seller_address?: string | null;
          seller_po_box?: string | null;
          purchase_id?: string | null;
          date_purchased?: string | null;
          date_sold?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      financing_agreements: {
        Row: {
          id: string;
          contract_no: string;
          client_id: string;
          vehicle_id: string;
          sale_price: number;
          deposit_paid: number;
          principal_amount: number;
          monthly_due: number;
          interest_rate: number;
          duration_months: number;
          start_date: string;
          end_date: string;
          last_payment_date: string | null;
          balance: number;
          status: AgreementStatus;
          aging_bucket: AgingBucket;
          days_overdue: number;
          total_penalties: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_no: string;
          client_id: string;
          vehicle_id: string;
          sale_price: number;
          deposit_paid?: number;
          principal_amount?: number;
          monthly_due: number;
          interest_rate?: number;
          duration_months?: number;
          start_date?: string;
          end_date?: string;
          last_payment_date?: string | null;
          balance?: number;
          status?: AgreementStatus;
          aging_bucket?: AgingBucket;
          days_overdue?: number;
          total_penalties?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_no?: string;
          client_id?: string;
          vehicle_id?: string;
          sale_price?: number;
          deposit_paid?: number;
          principal_amount?: number;
          monthly_due?: number;
          interest_rate?: number;
          duration_months?: number;
          start_date?: string;
          end_date?: string;
          last_payment_date?: string | null;
          balance?: number;
          status?: AgreementStatus;
          aging_bucket?: AgingBucket;
          days_overdue?: number;
          total_penalties?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financing_agreements_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financing_agreements_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          }
        ];
      };
      repayments: {
        Row: {
          id: string;
          receipt_no: string;
          agreement_id: string;
          client_id: string;
          amount_paid: number;
          payment_method: PaymentMethod;
          payment_date: string;
          penalty_amount: number;
          allocated_penalties: number;
          allocated_overdue_interest: number;
          allocated_principal: number;
          reference_no: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_no: string;
          agreement_id: string;
          client_id: string;
          amount_paid: number;
          payment_method?: PaymentMethod;
          payment_date?: string;
          penalty_amount?: number;
          allocated_penalties?: number;
          allocated_overdue_interest?: number;
          allocated_principal?: number;
          reference_no?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_no?: string;
          agreement_id?: string;
          client_id?: string;
          amount_paid?: number;
          payment_method?: PaymentMethod;
          payment_date?: string;
          penalty_amount?: number;
          allocated_penalties?: number;
          allocated_overdue_interest?: number;
          allocated_principal?: number;
          reference_no?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repayments_agreement_id_fkey";
            columns: ["agreement_id"];
            referencedRelation: "financing_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repayments_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      vehicle_costs: {
        Row: {
          id: string;
          vehicle_id: string;
          cost_type: VehicleCostType;
          amount: number;
          description: string;
          receipt_url: string | null;
          vendor_name: string | null;
          incurred_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          cost_type: VehicleCostType;
          amount: number;
          description: string;
          receipt_url?: string | null;
          vendor_name?: string | null;
          incurred_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          cost_type?: VehicleCostType;
          amount?: number;
          description?: string;
          receipt_url?: string | null;
          vendor_name?: string | null;
          incurred_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_costs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          }
        ];
      };
      crm_leads: {
        Row: {
          id: string;
          vehicle_id: string | null;
          full_name: string;
          phone: string;
          email: string | null;
          national_id: string | null;
          interest_type: LeadInterestType;
          proposed_deposit: number | null;
          monthly_budget: number | null;
          status: LeadStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id?: string | null;
          full_name: string;
          phone: string;
          email?: string | null;
          national_id?: string | null;
          interest_type?: LeadInterestType;
          proposed_deposit?: number | null;
          monthly_budget?: number | null;
          status?: LeadStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string | null;
          full_name?: string;
          phone?: string;
          email?: string | null;
          national_id?: string | null;
          interest_type?: LeadInterestType;
          proposed_deposit?: number | null;
          monthly_budget?: number | null;
          status?: LeadStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_leads_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          }
        ];
      };
      financing_installments: {
        Row: {
          id: string;
          agreement_id: string;
          client_id: string;
          installment_number: number;
          due_date: string;
          principal_due: number;
          interest_due: number;
          fees_due: number;
          penalties_due: number;
          principal_paid: number;
          interest_paid: number;
          fees_paid: number;
          penalties_paid: number;
          amount_due: number;
          amount_paid: number;
          is_settled: boolean;
          status: string;
          paid_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agreement_id: string;
          client_id: string;
          installment_number: number;
          due_date: string;
          principal_due?: number;
          interest_due?: number;
          fees_due?: number;
          penalties_due?: number;
          principal_paid?: number;
          interest_paid?: number;
          fees_paid?: number;
          penalties_paid?: number;
          amount_due?: number;
          amount_paid?: number;
          is_settled?: boolean;
          status?: string;
          paid_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agreement_id?: string;
          client_id?: string;
          installment_number?: number;
          due_date?: string;
          principal_due?: number;
          interest_due?: number;
          fees_due?: number;
          penalties_due?: number;
          principal_paid?: number;
          interest_paid?: number;
          fees_paid?: number;
          penalties_paid?: number;
          amount_due?: number;
          amount_paid?: number;
          is_settled?: boolean;
          status?: string;
          paid_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financing_installments_agreement_id_fkey";
            columns: ["agreement_id"];
            referencedRelation: "financing_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financing_installments_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      company_settings: {
        Row: {
          id: string;
          company_name: string;
          kra_pin: string | null;
          physical_address: string | null;
          primary_phone: string | null;
          email_address: string | null;
          mpesa_paybill: string | null;
          mpesa_account: string | null;
          bank_name: string | null;
          bank_account: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name?: string;
          kra_pin?: string | null;
          physical_address?: string | null;
          primary_phone?: string | null;
          email_address?: string | null;
          mpesa_paybill?: string | null;
          mpesa_account?: string | null;
          bank_name?: string | null;
          bank_account?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          kra_pin?: string | null;
          physical_address?: string | null;
          primary_phone?: string | null;
          email_address?: string | null;
          mpesa_paybill?: string | null;
          mpesa_account?: string | null;
          bank_name?: string | null;
          bank_account?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      vehicle_status: 'in_stock' | 'reserved' | 'financed' | 'repossessed' | 'cash_sale';
      agreement_status: AgreementStatus;
      aging_bucket: AgingBucket;
      payment_method: PaymentMethod;
      vehicle_cost_type: VehicleCostType;
      lead_interest_type: LeadInterestType;
      lead_status: LeadStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Client = Tables<'clients'>;
export type Vehicle = Tables<'vehicles'>;
export type FinancingAgreement = Tables<'financing_agreements'>;
export type RepaymentRecord = Tables<'repayments'>;
export type VehicleCost = Tables<'vehicle_costs'>;
export type CrmLead = Tables<'crm_leads'>;
export type FinancingInstallment = Tables<'financing_installments'>;
export type CompanySettings = Tables<'company_settings'>;
