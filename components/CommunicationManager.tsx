'use client';

import React, { useState, useTransition } from 'react';
import { Plus, MessageSquare, Phone, Mail, FileText, CheckCircle, X, Loader2, ChevronDown } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createManualCommunication } from '@/lib/actions/collections.actions';
import ClientSearchSelect from './ClientSearchSelect';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'CALL', label: 'Phone Call' },
  { value: 'IN_PERSON', label: 'In-Person Meeting' },
];

const QUICK_RESPONSES = [
  "The client is not picking up the call",
  "The client is unreachable",
  "The client promised to call back later",
  "The client requested to reschedule",
  "The client's number is busy/engaged",
  "The client hanged up the call",
];

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  nationalId?: string;
  phone: string;
  email: string;
}

interface CommunicationManagerProps {
  clients: ClientOption[];
}

export default function CommunicationManager({ clients }: CommunicationManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    clientId: '',
    channel: 'SMS',
    subject: '',
    messageBody: '',
    sendNow: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Extract clientId from FormData since ClientSearchSelect uses a hidden input
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const clientId = form.get('clientId') as string;

    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!formData.messageBody.trim()) {
      toast.error('Please enter a message');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createManualCommunication({
          clientId,
          channel: formData.channel as any,
          messageBody: formData.messageBody,
          subject: formData.subject,
          sendNow: formData.sendNow
        });

        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(formData.sendNow ? 'Message sent successfully!' : 'Communication logged!');
          setIsOpen(false);
          setFormData({
            clientId: '',
            channel: 'SMS',
            subject: '',
            messageBody: '',
            sendNow: true,
          });
        }
      } catch (err: any) {
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-submit flex items-center justify-center gap-2"
      >
        <Plus className="size-5" />
        New Message / Log
      </button>

      {isOpen && (
        <div
          className="modal-overlay"
          style={{ animation: 'none' }}
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="comm-modal-title" style={{ overflow: 'visible', maxWidth: '600px', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div className="modal-header" style={{ paddingBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem',
                  background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageSquare size={18} style={{ color: '#1D4ED8' }} />
                </div>
                <h2 className="modal-title" id="comm-modal-title" style={{ fontSize: '1.25rem' }}>
                  Communicate &amp; Log
                </h2>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="modal-body" style={{ flex: 1, paddingTop: '1rem', paddingBottom: '2rem' }}>

                <div className="form-field">
                  <label className="form-label" htmlFor="comm-client">Select Client</label>
                  <ClientSearchSelect
                    clients={clients.map(c => ({
                      $id: c.id,
                      firstName: c.firstName,
                      lastName: c.lastName,
                      nationalId: c.nationalId || '',
                      phone: c.phone
                    }))}
                    name="clientId"
                    defaultClientId={clients.length === 1 ? clients[0].id : undefined}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="form-field mb-0">
                    <label className="form-label" htmlFor="comm-channel">Channel</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="form-select w-full flex items-center justify-between"
                          style={{ padding: '0.75rem 1rem', fontSize: '1.05rem', backgroundColor: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '0.625rem', outline: 'none' }}
                        >
                          <span>{CHANNELS.find(c => c.value === formData.channel)?.label}</span>
                          <ChevronDown className="size-4 opacity-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start" style={{ width: '100%' }}>
                        {CHANNELS.map((channel) => (
                          <DropdownMenuItem
                            key={channel.value}
                            onClick={() => setFormData(prev => ({ ...prev, channel: channel.value }))}
                            className="left-3 text-14 py-2 cursor-pointer"
                          >
                            {channel.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="form-field mb-0">
                    <label className="form-label" htmlFor="comm-action">Action</label>
                    <div style={{
                      display: 'flex', alignItems: 'center', height: '100%',
                      background: '#F9FAFB', border: '1px solid #E5E7EB',
                      borderRadius: '0.5rem', padding: '0 1rem', gap: '0.5rem'
                    }}>
                      <input
                        type="checkbox"
                        id="comm-sendnow"
                        name="sendNow"
                        checked={formData.sendNow}
                        onChange={handleChange}
                        style={{ width: '1.2rem', height: '1.2rem' }}
                        disabled={['CALL', 'IN_PERSON'].includes(formData.channel)}
                      />
                      <label htmlFor="comm-sendnow" style={{ fontSize: '0.9rem', color: '#4B5563', cursor: 'pointer', userSelect: 'none' }}>
                        Send Actual Message
                      </label>
                    </div>
                  </div>
                </div>

                {formData.channel === 'EMAIL' && (
                  <div className="form-field mt-4">
                    <label className="form-label" htmlFor="comm-subject">Subject</label>
                    <input
                      id="comm-subject"
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Message Subject..."
                      style={{ padding: '0.75rem 1rem', fontSize: '1.05rem' }}
                    />
                  </div>
                )}

                <div className="form-field mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="form-label !mb-0" htmlFor="comm-body">Message / Notes</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(badgeVariants({ variant: "secondary" }), "cursor-pointer gap-1.5")}
                        >
                          <MessageSquare className="size-3.5" />
                          <span>Quick Responses</span>
                          <ChevronDown className="size-3.5 opacity-70" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        {QUICK_RESPONSES.map((response) => (
                          <DropdownMenuItem
                            key={response}
                            onClick={() => setFormData(prev => ({ ...prev, messageBody: response }))}
                          >
                            {response}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <textarea
                    id="comm-body"
                    name="messageBody"
                    value={formData.messageBody}
                    onChange={handleChange}
                    className="form-input"
                    placeholder={formData.sendNow ? "Type your message to the client here..." : "Type your notes from the call/meeting..."}
                    rows={5}
                    style={{ padding: '0.75rem 1rem', fontSize: '1.05rem', resize: 'vertical' }}
                    required
                  />
                  {!formData.sendNow && (
                    <span className="form-hint text-amber-600 mt-2 block">
                      This will only be saved to the client's communication history. It will NOT be sent to the client.
                    </span>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  type="submit"
                  disabled={isPending}
                  className="action-btn action-btn-primary"
                  style={{
                    opacity: isPending ? 0.6 : 1,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isPending ? (
                    <><Loader2 size={15} className="auth-spinner" /><span>Processing…</span></>
                  ) : (
                    <><CheckCircle size={15} /><span>{formData.sendNow ? 'Send & Log' : 'Save Log'}</span></>
                  )}
                </button>
                <button
                  type="button"
                  className="action-btn action-btn-outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
