"use server";

import { createSupabaseAdminClient } from "../supabase";
import { NotificationService, NotificationChannel } from "../notifications";
import { renderTemplate, TemplateData } from "../templates";
import { formatAmount } from "../utils";
import { revalidatePath } from "next/cache";

import { CollectionsService } from "../services/collections.service";

export async function triggerEventNotification(loanId: string, eventType: string, customData: any = {}) {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: loan } = await supabase
      .from('loans')
      .select('*, clients(*)')
      .eq('id', loanId)
      .single();

    if (!loan) throw new Error(`Loan ${loanId} not found`);
    const client = loan.clients;

    const { data: template } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('name', eventType)
      .eq('is_active', true)
      .single();

    if (!template) throw new Error(`Template ${eventType} not found`);

    const { data: firstInstallment } = await supabase
      .from('loan_installments')
      .select('principal_due, interest_due, fees_due, penalties_due, due_date')
      .eq('loan_id', loanId)
      .order('installment_number', { ascending: true })
      .limit(1)
      .single();

    const instAmount = firstInstallment
      ? (firstInstallment.principal_due + firstInstallment.interest_due + (firstInstallment.fees_due || 0) + (firstInstallment.penalties_due || 0))
      : (loan.total_payable / loan.duration_in_months);

    const actualDueDate = firstInstallment?.due_date
      ? new Date(firstInstallment.due_date).toLocaleDateString()
      : (loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A');

    const templateData: TemplateData = {
      client_name: client?.full_name || `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'Valued Client',
      loan_amount: formatAmount(loan.principal_amount),
      due_date: actualDueDate,
      outstanding_balance: formatAmount(loan.balance),
      installment_amount: formatAmount(instAmount),
      company_name: "Ebenezar Enterprises Car Bazaar LTD",
      ...customData
    };

    const renderedBody = renderTemplate(template.body_template, templateData);
    const renderedSubject = template.subject_template ? renderTemplate(template.subject_template, templateData) : undefined;

    // Fire without awaiting to prevent blocking the UI
    NotificationService.send({
      loanId,
      clientId: client.id,
      templateType: eventType,
      phone: client.phone,
      email: client.email,
      messageBody: renderedBody,
      subject: renderedSubject,
      channels: template.channels
    }).catch(e => console.error("[triggerEventNotification] send error:", e));

    console.log(`[triggerEventNotification] Dispatched ${eventType} for loan ${loanId} synchronously.`);
  } catch (error) {
    console.error(`[triggerEventNotification] Failed:`, error);
  }
}

/**
 * Main Collections Engine logic
 * Should be called by a CRON job daily or via manual trigger.
 * This is now NON-BLOCKING as it enqueues bulk jobs.
 */
export async function processAutomatedReminders() {
  try {
    const processed = await CollectionsService.scanAndEnqueueReminders();
    return { processed };
  } catch (error) {
    console.error("[processAutomatedReminders] Fatal error:", error);
    throw error;
  }
}

/**
 * Schedules all future reminders for a newly approved loan
 */
export async function scheduleLoanReminders(loanId: string) {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: loan } = await supabase.from('loans').select('due_date').eq('id', loanId).single();
    if (!loan?.due_date) return;

    const dueDate = new Date(loan.due_date);

    // Timeline: 7 days before, 3 days before, Due Date, 3 days overdue, 7 days overdue
    const timelines = [
      { type: 'PAYMENT_REMINDER', days: -7 },
      { type: 'PAYMENT_REMINDER', days: -3 },
      { type: 'PAYMENT_REMINDER', days: 0 },
      { type: 'OVERDUE_NOTICE', days: 3 },
      { type: 'OVERDUE_NOTICE', days: 7 }
    ];

    const schedules = timelines.map(t => {
      const date = new Date(dueDate);
      date.setDate(date.getDate() + t.days);
      return {
        loan_id: loanId,
        reminder_type: t.type,
        scheduled_for: date.toISOString().split('T')[0],
        status: 'PENDING'
      };
    });

    await supabase.from('reminder_schedules').insert(schedules);
  } catch (error) {
    console.error("[scheduleLoanReminders] Error:", error);
  }
}

/**
 * Fetches the communication history for a specific client or loan
 */
export async function getNotifications(params: { clientId?: string; loanId?: string }) {
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from('notifications')
      .select('*, clients(id, full_name, phone, email, client_id_number)')
      .order('created_at', { ascending: false });

    if (params.loanId) {
      query = query.eq('loan_id', params.loanId);
    } else if (params.clientId) {
      query = query.eq('client_id', params.clientId);
    }

    const { data, error } = await query;
    if (error) {
      // Fallback if the foreign key relationship is missing in the database schema (PostgREST Error PGRST200)
      if (error.code === 'PGRST200') {
        console.warn(
          "[getNotifications] ⚠️ Database relationship between 'notifications' and 'clients' is missing. " +
          "Falling back to basic notification query without joining client names. " +
          "To fix this completely, please ensure you run the database migration to add the foreign key constraint."
        );

        let fallbackQuery = supabase.from('notifications').select('*').order('created_at', { ascending: false });
        if (params.loanId) {
          fallbackQuery = fallbackQuery.eq('loan_id', params.loanId);
        } else if (params.clientId) {
          fallbackQuery = fallbackQuery.eq('client_id', params.clientId);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      throw error;
    }

    const rawNotifications = data || [];
    const loanIds = [...new Set(rawNotifications.map((n: any) => n.loan_id).filter(Boolean))];
    const clientIds = [...new Set(rawNotifications.map((n: any) => n.client_id).filter(Boolean))];

    const agreementMapByLoanId: Record<string, any> = {};
    const agreementMapByClientId: Record<string, any> = {};

    try {
      if (loanIds.length > 0 || clientIds.length > 0) {
        let agQuery = supabase
          .from('financing_agreements')
          .select('id, contract_no, client_id, status, vehicles(id, registration_no, make_model, year, color)');

        if (loanIds.length > 0) {
          agQuery = agQuery.in('id', loanIds);
        } else {
          agQuery = agQuery.in('client_id', clientIds);
        }

        const { data: agData } = await agQuery;
        if (agData) {
          agData.forEach((ag: any) => {
            agreementMapByLoanId[ag.id] = ag;
            if (!agreementMapByClientId[ag.client_id] || ag.status === 'active') {
              agreementMapByClientId[ag.client_id] = ag;
            }
          });
        }
      }
    } catch (agErr) {
      console.warn("[getNotifications] Agreement enrichment note:", agErr);
    }

    const formattedData = rawNotifications.map((notif: any) => {
      const client = notif.clients;
      const agreement = (notif.loan_id ? agreementMapByLoanId[notif.loan_id] : null) || (notif.client_id ? agreementMapByClientId[notif.client_id] : null);
      let firstName = '';
      let lastName = '';
      if (client?.full_name) {
        const parts = client.full_name.trim().split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }
      return {
        ...notif,
        agreement: agreement || null,
        clients: client
          ? {
              ...client,
              first_name: firstName,
              last_name: lastName,
              full_name: client.full_name,
            }
          : null,
      };
    });

    return formattedData;
  } catch (error: any) {
    console.error("[getNotifications] Error:", error.message || error);
    return [];
  }
}

/**
 * Fetches communication analytics for the dashboard
 */
export async function getCommunicationAnalytics() {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: notifications } = await supabase
      .from('notifications')
      .select('status, channel, template_type');

    if (!notifications) return null;

    const stats = {
      totalSent: notifications.length,
      delivered: notifications.filter(n => n.status === 'SENT' || n.status === 'DELIVERED').length,
      failed: notifications.filter(n => n.status === 'FAILED').length,
      byChannel: {
        SMS: notifications.filter(n => n.channel === 'SMS').length,
        WHATSAPP: notifications.filter(n => n.channel === 'WHATSAPP').length,
        EMAIL: notifications.filter(n => n.channel === 'EMAIL').length,
      },
      byType: {} as Record<string, number>
    };

    notifications.forEach(n => {
      stats.byType[n.template_type] = (stats.byType[n.template_type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error("[getCommunicationAnalytics] Error:", error);
    return null;
  }
}

/**
 * Creates a manual communication entry.
 * Can either directly send an SMS/Email/WhatsApp using NotificationService,
 * or simply log a manual phone call / in-person meeting to the database.
 */
export async function createManualCommunication(data: {
  clientId: string;
  loanId?: string;
  channel: NotificationChannel | 'CALL' | 'IN_PERSON';
  messageBody: string;
  subject?: string;
  sendNow: boolean;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: client } = await supabase.from('clients').select('*').eq('id', data.clientId).single();
    if (!client) throw new Error('Client not found');

    if (data.sendNow && ['SMS', 'EMAIL', 'WHATSAPP'].includes(data.channel)) {
      // Send message via NotificationService (which also logs it)
      await NotificationService.send({
        loanId: data.loanId,
        clientId: data.clientId,
        templateType: 'MANUAL_MESSAGE',
        phone: client.phone,
        email: client.email,
        messageBody: data.messageBody,
        subject: data.subject,
        channels: [data.channel as NotificationChannel],
      });
    } else {
      // Just log it in the database
      const errorStr = `[Manual Log] ${data.subject ? data.subject + ' - ' : ''}${data.messageBody}`;
      const { error: insertError } = await supabase.from('notifications').insert({
        client_id: data.clientId,
        loan_id: data.loanId,
        recipient: data.channel === 'EMAIL' ? client.email : (client.phone || 'N/A'),
        channel: data.channel,
        template_type: 'MANUAL_LOG',
        status: 'LOGGED',
        message_body: data.messageBody,
        error_message: data.subject || null
      });
      if (insertError) throw insertError;
    }

    revalidatePath('/communications');
    revalidatePath(`/clients/${data.clientId}`);

    return { success: true };
  } catch (error: any) {
    console.error('[createManualCommunication] Error:', error);
    return { error: error.message || 'Failed to record communication' };
  }
}
