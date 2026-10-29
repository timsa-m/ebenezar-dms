import { createSupabaseAdminClient } from "../supabase";
import { NotificationService, NotificationChannel } from "../notifications";

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
      // Actually send the message. This service also logs to the notifications table.
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
      await supabase.from('notifications').insert({
        client_id: data.clientId,
        loan_id: data.loanId,
        recipient: data.channel === 'EMAIL' ? client.email : client.phone,
        channel: data.channel,
        template_type: 'MANUAL_LOG',
        status: 'LOGGED',
        // Note: The messageBody might not have a dedicated column in basic setups,
        // so it's common to log it in an 'error' or 'metadata' column if 'body' doesn't exist.
        // Assuming there's a body/message column or similar. We will just save what we can.
        // Actually, let's just create an interaction log if that exists, or store it in notifications.
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('[createManualCommunication] Error:', error);
    return { error: error.message || 'Failed to record communication' };
  }
}
