'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useTheme } from 'next-themes';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import HeaderBox from '@/components/HeaderBox';
import { updateCompanySettings } from '@/lib/actions/settings.actions';
import { uploadUserAvatar, updateUserProfile, updateUserThemePreference } from '@/lib/actions/user.actions';
import { toast } from '@/lib/toast';
import confetti from 'canvas-confetti';
import {
  User,
  Palette,
  Building2,
  Globe,
  Car,
  CreditCard,
  MessageSquare,
  FileText,
  Users,
  Link as LinkIcon,
  Shield,
  ChevronRight,
  Save,
  Sun,
  Moon,
  Monitor,
  Loader2,
  Check,
} from 'lucide-react';

export default function SettingsLayout({
  user,
  initialSettings,
  initialTab = 'Profile',
}: {
  user: any;
  initialSettings?: any;
  initialTab?: string;
}) {
  const [activeTab, setActiveTab] = usePersistedState('dms_settings_tab', initialTab || 'Profile');
  const [isPending, startTransition] = useTransition();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.avatarUrl || null);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? theme : (user?.themePreference || 'system');

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'graphite' | 'system') => {
    setTheme(newTheme);
    try {
      await updateUserThemePreference(newTheme);
      const label =
        newTheme === 'graphite'
          ? 'Graphite Blue'
          : newTheme === 'dark'
          ? 'Midnight Lime'
          : newTheme === 'light'
          ? 'Light'
          : 'System';
      toast.success(`Theme preference set to ${label}`);
    } catch (e) {
      console.error('Failed to sync theme preference:', e);
    }
  };

  const [formData, setFormData] = useState({
    company_name: initialSettings?.company_name || 'EBENEZAR ENTERPRISES CAR BAZAAR',
    kra_pin: initialSettings?.kra_pin || 'P051412345A',
    physical_address: initialSettings?.physical_address || 'Opposite Kibuye Market, Kisumu-Kakamega Highway, Kisumu, Kenya',
    primary_phone: initialSettings?.primary_phone || '+254 712 345 678',
    email_address: initialSettings?.email_address || 'info@ebenezarcarbazaar.co.ke',
    mpesa_paybill: initialSettings?.mpesa_paybill || '',
    mpesa_account: initialSettings?.mpesa_account || '',
    bank_name: initialSettings?.bank_name || '',
    bank_account: initialSettings?.bank_account || '',
    minimum_deposit_percentage: initialSettings?.minimum_deposit_percentage ?? 40,
    late_payment_penalty_percentage: initialSettings?.late_payment_penalty_percentage ?? 20,
    grace_period_days: initialSettings?.grace_period_days ?? 3,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateCompanySettings(formData);
      if (res.success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        toast.success("Settings updated successfully.");
      } else {
        toast.error(res.error || "Failed to update settings.");
      }
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error("File size must be less than 1MB.", {
        description: "Please select an image smaller than 1MB.",
      });
      return;
    }

    setIsUploadingAvatar(true);

    // Create immediate local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadUserAvatar(formData);
      if (res.success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        toast.success("Your new avatar has been saved successfully.");
      } else {
        toast.error(res.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      toast.error("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleProfileSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    
    if (!firstName || !lastName) {
      toast.error('First name and last name are required.');
      return;
    }

    startTransition(async () => {
      const res = await updateUserProfile(firstName, lastName);
      if (res.success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        toast.success('Your personal details have been saved.');
      } else {
        toast.error(res.error || 'Failed to save profile.');
      }
    });
  };

  const menuGroups = [
    {
      group: 'Personal',
      items: [
        { name: 'Profile', icon: User, adminOnly: false },
        { name: 'Appearance', icon: Palette, adminOnly: false },
      ],
    },
    {
      group: 'Organization',
      items: [
        { name: 'Business', icon: Building2, adminOnly: true },
        { name: 'Website', icon: Globe, adminOnly: true },
        { name: 'Vehicles', icon: Car, adminOnly: true },
        { name: 'Financing', icon: CreditCard, adminOnly: true },
      ],
    },
    {
      group: 'Advanced',
      items: [
        { name: 'Communications', icon: MessageSquare, adminOnly: true },
        { name: 'Documents', icon: FileText, adminOnly: true },
        { name: 'Users & Permissions', icon: Users, adminOnly: true },
        { name: 'Integrations', icon: LinkIcon, adminOnly: true },
        { name: 'Security', icon: Shield, adminOnly: true },
      ],
    },
  ];

  return (
    <section className="home-content relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="mb-8">
        <HeaderBox
          title="Settings"
          subtext="Manage your personal preferences and organization configurations."
        />
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Settings navigation */}
        <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-64">
          <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/60 p-2 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-border/80 dark:bg-card/75 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-5 p-2">
              {menuGroups.map((group, idx) => {
                const visibleItems = group.items.filter(
                  (item) =>
                    !item.adminOnly || user?.role === 'ADMIN'
                );

                if (visibleItems.length === 0) return null;

                return (
                  <div key={idx}>
                    <h4 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-muted-foreground">
                      {group.group}
                    </h4>

                    <nav className="flex flex-col gap-1">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.name;

                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setActiveTab(item.name)}
                            className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                              isActive
                                ? 'bg-white text-gray-950 shadow-sm ring-1 ring-gray-200/80 dark:bg-sidebar-accent dark:text-foreground dark:ring-border/80 dark:shadow-md'
                                : 'text-gray-500 hover:bg-white/70 hover:text-gray-900 dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-foreground'
                            }`}
                          >
                            <span
                              className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                                isActive
                                  ? 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary dark:border dark:border-primary/30 dark:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)]'
                                  : 'bg-gray-100/70 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600 dark:bg-white/5 dark:text-muted-foreground dark:border dark:border-white/5 dark:group-hover:bg-white/10 dark:group-hover:text-foreground'
                              }`}
                            >
                              <Icon className="size-[17px] transition-colors" strokeWidth={isActive ? 2.2 : 1.8} />
                            </span>

                            <span
                              className={`truncate ${
                                isActive ? 'font-semibold text-gray-950 dark:text-foreground' : 'font-medium'
                              }`}
                            >
                              {item.name}
                            </span>

                            {isActive && (
                              <ChevronRight className="ml-auto size-4 text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main panel */}
        <main className="min-w-0 flex-1">
          <div className="min-h-[520px] rounded-2xl border border-white/70 bg-white/65 p-4 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-border/80 dark:bg-card/75 dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)] sm:p-6 lg:p-8">
            {/* Business */}
            {activeTab === 'Business' && (
              <div>
                <div className="mb-8 border-b border-gray-200/70 dark:border-border pb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary dark:border dark:border-primary/25">
                      <Building2 className="size-5" />
                    </div>

                    <div>
                      <h3 className="text-[18px] font-semibold tracking-tight text-gray-950 dark:text-foreground">
                        Business Profile
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-muted-foreground">
                        Company details, branding, and contact information.
                      </p>
                    </div>
                  </div>
                </div>

                <form className="space-y-7" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Company Name
                      </label>

                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        className="input-class w-full rounded-xl border-gray-200/80 bg-white/70 transition-all focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        KRA PIN
                      </label>

                      <input
                        type="text"
                        name="kra_pin"
                        value={formData.kra_pin}
                        onChange={handleChange}
                        className="input-class w-full rounded-xl border-gray-200/80 bg-white/70 transition-all focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Primary Phone
                      </label>

                      <input
                        type="text"
                        name="primary_phone"
                        value={formData.primary_phone}
                        onChange={handleChange}
                        className="input-class w-full rounded-xl border-gray-200/80 bg-white/70 transition-all focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Email Address
                      </label>

                      <input
                        type="email"
                        name="email_address"
                        value={formData.email_address}
                        onChange={handleChange}
                        className="input-class w-full rounded-xl border-gray-200/80 bg-white/70 transition-all focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Physical Address
                    </label>

                    <textarea
                      rows={3}
                      name="physical_address"
                      value={formData.physical_address}
                      onChange={handleChange}
                      className="input-class w-full resize-none rounded-xl border-gray-200/80 bg-white/70 transition-all focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5"
                    />
                  </div>

                  <div className="flex items-center justify-end border-t border-gray-200/70 pt-6">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="btn-submit inline-flex w-auto items-center rounded-xl px-6 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Appearance */}
            {activeTab === 'Appearance' && (
              <div>
                <div className="mb-8 border-b border-gray-200/70 pb-6 dark:border-[#29352D]">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary dark:border dark:border-primary/25">
                      <Palette className="size-5" />
                    </div>

                    <div>
                      <h3 className="text-[18px] font-semibold tracking-tight text-gray-950 dark:text-[#F4F7F4]">
                        Appearance
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-[#A1ADA4]">
                        Customize how the dealership management system looks and feels across your devices.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-[#F4F7F4]">
                        Interface theme
                      </h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-[#A1ADA4]">
                        Select Light, Midnight Lime, Graphite Blue, or System mode. Your preference syncs to your user profile and active session.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Light */}
                      <button
                        type="button"
                        onClick={() => handleThemeChange('light')}
                        className={`group rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                          currentTheme === 'light'
                            ? 'border-primary/40 bg-white ring-2 ring-primary/20 shadow-md dark:border-[#B7FF3C] dark:ring-[#B7FF3C]/20 dark:bg-[#1D2920]'
                            : 'border-gray-200/80 bg-white/70 hover:border-gray-300 dark:border-[#29352D] dark:bg-[#101612]/60 dark:hover:border-[#3b4d40]'
                        }`}
                      >
                        <div className="mb-4 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-gray-200/80 bg-gray-50 shadow-inner">
                          <div className="w-[82%] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="flex h-5 items-center gap-1 border-b border-gray-100 px-2 bg-gray-50/70">
                              <span className="size-1.5 rounded-full bg-red-300" />
                              <span className="size-1.5 rounded-full bg-amber-300" />
                              <span className="size-1.5 rounded-full bg-emerald-300" />
                            </div>
                            <div className="flex h-16 bg-white">
                              <div className="w-1/4 border-r border-gray-100 bg-gray-50" />
                              <div className="flex flex-1 items-center justify-center">
                                <Sun className="size-7 text-amber-500" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#F4F7F4]">
                              Light
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-[#A1ADA4]">
                              Clean & bright surface
                            </p>
                          </div>

                          {currentTheme === 'light' ? (
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-white dark:bg-[#B7FF3C] dark:text-[#090C0A]">
                              <Check className="size-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="size-5 rounded-full border border-gray-300 dark:border-[#29352D]" />
                          )}
                        </div>
                      </button>

                      {/* Dark (Midnight Lime) */}
                      <button
                        type="button"
                        onClick={() => handleThemeChange('dark')}
                        className={`group rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                          currentTheme === 'dark'
                            ? 'border-[#B7FF3C] bg-[#151D17] ring-2 ring-[#B7FF3C]/25 shadow-lg'
                            : 'border-gray-200/80 bg-white/70 hover:border-gray-300 dark:border-[#29352D] dark:bg-[#101612]/60 dark:hover:border-[#3b4d40]'
                        }`}
                      >
                        <div className="mb-4 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-[#29352D] bg-[#090C0A] shadow-inner">
                          <div className="w-[82%] overflow-hidden rounded-lg border border-[#29352D] bg-[#151D17] shadow-sm">
                            <div className="flex h-5 items-center justify-between border-b border-[#29352D] px-2 bg-[#101612]">
                              <div className="flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-[#29352D]" />
                                <span className="size-1.5 rounded-full bg-[#29352D]" />
                                <span className="size-1.5 rounded-full bg-[#29352D]" />
                              </div>
                              <span className="h-1.5 w-6 rounded-full bg-[#B7FF3C]/70" />
                            </div>
                            <div className="flex h-16 bg-[#151D17]">
                              <div className="w-1/4 border-r border-[#29352D] bg-[#101612]" />
                              <div className="flex flex-1 items-center justify-center">
                                <Moon className="size-7 text-[#B7FF3C]" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-gray-900 dark:text-[#F4F7F4]">
                                Midnight Lime
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-[#A1ADA4]">
                              Deep black & neon lime
                            </p>
                          </div>

                          {currentTheme === 'dark' ? (
                            <span className="flex size-6 items-center justify-center rounded-full bg-[#B7FF3C] text-[#090C0A]">
                              <Check className="size-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="size-5 rounded-full border border-gray-300 dark:border-[#29352D]" />
                          )}
                        </div>
                      </button>

                      {/* Graphite Blue */}
                      <button
                        type="button"
                        onClick={() => handleThemeChange('graphite')}
                        className={`group rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                          currentTheme === 'graphite'
                            ? 'border-[#3A82FF] bg-[#161F2A] ring-2 ring-[#3A82FF]/25 shadow-lg'
                            : 'border-gray-200/80 bg-white/70 hover:border-gray-300 dark:border-[#29352D] dark:bg-[#101612]/60 dark:hover:border-[#3b4d40]'
                        }`}
                      >
                        <div className="mb-4 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-[#293647] bg-[#0B0F14] shadow-inner">
                          <div className="w-[82%] overflow-hidden rounded-lg border border-[#293647] bg-[#161F2A] shadow-sm">
                            <div className="flex h-5 items-center justify-between border-b border-[#293647] px-2 bg-[#111820]">
                              <div className="flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-[#293647]" />
                                <span className="size-1.5 rounded-full bg-[#293647]" />
                                <span className="size-1.5 rounded-full bg-[#293647]" />
                              </div>
                              <span className="h-1.5 w-6 rounded-full bg-[#3A82FF]/80" />
                            </div>
                            <div className="flex h-16 bg-[#161F2A]">
                              <div className="w-1/4 border-r border-[#293647] bg-[#111820]" />
                              <div className="flex flex-1 items-center justify-center">
                                <Moon className="size-7 text-[#3A82FF]" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-gray-900 dark:text-[#F8FAFC]">
                                Graphite Blue
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-[#A1ADBC]">
                              Dark charcoal & electric blue
                            </p>
                          </div>

                          {currentTheme === 'graphite' ? (
                            <span className="flex size-6 items-center justify-center rounded-full bg-[#3A82FF] text-white">
                              <Check className="size-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="size-5 rounded-full border border-gray-300 dark:border-[#293647]" />
                          )}
                        </div>
                      </button>

                      {/* System */}
                      <button
                        type="button"
                        onClick={() => handleThemeChange('system')}
                        className={`group rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                          currentTheme === 'system'
                            ? 'border-primary/40 bg-white ring-2 ring-primary/20 shadow-md dark:border-[#B7FF3C] dark:ring-[#B7FF3C]/20 dark:bg-[#1D2920]'
                            : 'border-gray-200/80 bg-white/70 hover:border-gray-300 dark:border-[#29352D] dark:bg-[#101612]/60 dark:hover:border-[#3b4d40]'
                        }`}
                      >
                        <div className="mb-4 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-tr from-[#151D17] via-slate-700 to-slate-200 dark:border-[#29352D] shadow-inner">
                          <div className="w-[82%] overflow-hidden rounded-lg border border-gray-300/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-[#29352D] dark:bg-[#151D17]/90">
                            <div className="flex h-5 items-center gap-1 border-b border-gray-200 px-2 dark:border-[#29352D]">
                              <span className="size-1.5 rounded-full bg-gray-400" />
                              <span className="size-1.5 rounded-full bg-gray-400" />
                              <span className="size-1.5 rounded-full bg-gray-400" />
                            </div>
                            <div className="flex h-16">
                              <div className="w-1/4 border-r border-gray-200 bg-gray-100 dark:border-[#29352D] dark:bg-[#101612]" />
                              <div className="flex flex-1 items-center justify-center">
                                <Monitor className="size-7 text-slate-700 dark:text-[#B7FF3C]" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#F4F7F4]">
                              System
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-[#A1ADA4]">
                              Follow device appearance
                            </p>
                          </div>

                          {currentTheme === 'system' ? (
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-white dark:bg-[#B7FF3C] dark:text-[#090C0A]">
                              <Check className="size-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="size-5 rounded-full border border-gray-300 dark:border-[#29352D]" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Theme Information Banner */}
                  <div className="rounded-2xl border border-gray-200/70 bg-gray-50/50 p-5 dark:border-[#29352D] dark:bg-[#101612]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm dark:bg-[#151D17] dark:text-[#B7FF3C]">
                        <Palette className="size-4" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-[#F4F7F4]">
                          Isolated Management Theme
                        </p>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500 dark:text-[#A1ADA4]">
                          This appearance theme applies exclusively to the private dealership management application. The public customer-facing car bazaar website, customer financing requests, and printable receipts/statements strictly retain their standard high-contrast formats.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile */}
            {activeTab === 'Profile' && (
              <div>
                <div className="mb-8 border-b border-gray-200/70 dark:border-border pb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary dark:border dark:border-primary/25">
                      <User className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-semibold tracking-tight text-gray-950 dark:text-foreground">
                        Personal Profile
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-muted-foreground">
                        Manage your account details and personal preferences.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-8">
                  <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border-2 border-primary/20 overflow-hidden relative group">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                    )}
                  </div>
                  <div>
                    <label className={`text-sm font-semibold transition-colors ${isUploadingAvatar ? 'text-gray-400 cursor-not-allowed' : 'text-primary hover:text-primary/80 cursor-pointer'}`}>
                      Change Avatar
                      <input type="file" className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleAvatarChange} disabled={isUploadingAvatar} />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {isUploadingAvatar ? (
                        <span className="text-primary flex items-center gap-1">
                          <Loader2 className="size-3 animate-spin" /> Uploading...
                        </span>
                      ) : (
                        "JPG, GIF or PNG. 1MB max."
                      )}
                    </p>
                  </div>
                </div>

                <form className="space-y-7" onSubmit={handleProfileSave}>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">First Name</label>
                      <input type="text" name="firstName" defaultValue={user?.firstName} className="input-class w-full rounded-xl border-gray-200/80 bg-white/70 transition-all focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Last Name</label>
                      <input type="text" name="lastName" defaultValue={user?.lastName} className="input-class w-full rounded-xl border-gray-200/80 bg-white/70 transition-all focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Email Address</label>
                      <input type="email" defaultValue={user?.email} disabled className="input-class w-full rounded-xl border-gray-200/80 bg-gray-50 text-gray-500 cursor-not-allowed" />
                    </div>

                  </div>
                  <div className="flex items-center justify-end border-t border-gray-200/70 pt-6">
                    <button type="submit" className="btn-submit inline-flex w-auto items-center rounded-xl px-6 shadow-sm transition-all hover:-translate-y-0.5">
                      <Save className="mr-2 size-4" /> Save Profile
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Website & Leads */}
            {activeTab === 'Website' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Header */}
                <div className="mb-8 border-b border-gray-200/70 dark:border-border pb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary dark:border dark:border-primary/25">
                      <Globe className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[18px] font-semibold tracking-tight text-gray-950 dark:text-foreground">Website & Leads</h3>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-muted-foreground">Configure your public-facing SEO, social links, and lead capture preferences.</p>
                    </div>
                  </div>
                </div>

                <form className="space-y-10" onSubmit={(e) => { e.preventDefault(); confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); toast.success("Website Settings Saved"); }}>
                  
                  {/* Lead Capture Settings */}
                  <section>
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-gray-900">Lead Capture</h4>
                      <p className="mt-1 text-sm text-gray-500">Manage where and how incoming leads are routed.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Public Support Email</label>
                        <input type="email" defaultValue="support@ebenezarcarbazaar.co.ke" className="input-class w-full rounded-xl border-gray-200 bg-white/70 py-2.5 px-3.5 text-sm transition-all placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5" />
                        <p className="text-xs leading-5 text-gray-400">Displayed on your public contact page.</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Lead Notification Email</label>
                        <input type="email" defaultValue="leads@ebenezarcarbazaar.co.ke" className="input-class w-full rounded-xl border-gray-200 bg-white/70 py-2.5 px-3.5 text-sm transition-all placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5" />
                        <p className="text-xs leading-5 text-gray-400">Internal email that receives web form submissions.</p>
                      </div>
                    </div>
                  </section>

                  <div className="h-px bg-gray-200/70" />

                  {/* SEO & Metadata */}
                  <section>
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-gray-900">SEO & Metadata</h4>
                      <p className="mt-1 text-sm text-gray-500">Optimize how your site appears on Google and social media.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Meta Title</label>
                        <input type="text" defaultValue="Ebenezar Enterprises Car Bazaar | Quality Vehicles & Financing" className="input-class w-full rounded-xl border-gray-200 bg-white/70 py-2.5 px-3.5 text-sm transition-all placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5" />
                        <p className="text-xs leading-5 text-gray-400">Appears as the blue link in search engine results (Recommended max 60 chars).</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Meta Description</label>
                        <textarea rows={3} defaultValue="Leading car dealership offering affordable financing and quality vehicles. Browse our inventory today." className="input-class w-full resize-none rounded-xl border-gray-200 bg-white/70 py-2.5 px-3.5 text-sm transition-all placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5" />
                        <p className="text-xs leading-5 text-gray-400">A brief summary of your site that appears under the title in search results.</p>
                      </div>
                    </div>
                  </section>

                  <div className="h-px bg-gray-200/70" />

                  {/* Social Links */}
                  <section>
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-gray-900">Social Links</h4>
                      <p className="mt-1 text-sm text-gray-500">Links for the website footer and contact pages.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Facebook URL</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-gray-400">https://</span>
                          <input type="text" defaultValue="facebook.com/ebenezar" className="input-class w-full rounded-xl border-gray-200 bg-white/70 py-2.5 pl-16 pr-3.5 text-sm transition-all placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Instagram Handle</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-gray-400">@</span>
                          <input type="text" defaultValue="ebenezar_cars" className="input-class w-full rounded-xl border-gray-200 bg-white/70 py-2.5 pl-8 pr-3.5 text-sm transition-all placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5" />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Footer */}
                  <div className="flex flex-col gap-4 border-t border-gray-200/70 pt-6 sm:flex-row sm:items-center sm:justify-end">
                    <button type="submit" className="btn-submit inline-flex w-full shrink-0 items-center justify-center rounded-xl px-6 py-2.5 text-sm shadow-sm transition-all hover:-translate-y-0.5 sm:w-auto">
                      <Save className="mr-2 size-4" /> Save Website Config
                    </button>
                  </div>
                </form>
              </div>
            )}


            {/* Financing */}
            {activeTab === 'Financing' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Header */}
                <div className="mb-8 border-b border-gray-200/70 dark:border-border pb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary dark:border dark:border-primary/25">
                      <CreditCard className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-[18px] font-semibold tracking-tight text-gray-950 dark:text-foreground">
                        Financing Defaults
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-muted-foreground">
                        Configure the default rates and repayment rules used when creating
                        new loan agreements.
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  className="space-y-10"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                >
                  {/* Standard Rates */}
                  <section>
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Standard rates
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        Defaults applied when creating a new financing agreement.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">

                      {/* Minimum Deposit */}
                      <div className="space-y-2">
                        <label
                          htmlFor="minimum-deposit"
                          className="block text-xs font-medium text-gray-700"
                        >
                          Minimum deposit
                        </label>

                        <div className="relative">
                          <input
                            id="minimum-deposit"
                            name="minimum_deposit_percentage"
                            type="number"
                            value={formData.minimum_deposit_percentage}
                            onChange={handleChange}
                            className="input-class w-full rounded-xl border-gray-200 bg-white/70 py-2.5 pl-3.5 pr-10 text-sm transition-all placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5"
                          />

                          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-gray-400">
                            %
                          </span>
                        </div>

                        <p className="text-xs leading-5 text-gray-400">
                          Required upfront payment of the vehicle sale price.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Divider */}
                  <div className="h-px bg-gray-200/70" />

                  {/* Overdue Rules */}
                  <section>
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Overdue rules & penalties
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        Define what happens when a scheduled installment is missed.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                      {/* Late Payment Penalty */}
                      <div className="space-y-2">
                        <label
                          htmlFor="late-payment-penalty"
                          className="block text-xs font-medium text-gray-700"
                        >
                          Late payment penalty
                        </label>

                        <div className="relative">
                          <input
                            id="late-payment-penalty"
                            name="late_payment_penalty_percentage"
                            type="number"
                            value={formData.late_payment_penalty_percentage}
                            onChange={handleChange}
                            className="input-class w-full rounded-xl border-gray-200 bg-white/70 py-2.5 pl-3.5 pr-10 text-sm transition-all placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5"
                          />

                          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-gray-400">
                            %
                          </span>
                        </div>

                        <p className="text-xs leading-5 text-gray-400">
                          Applied as a percentage of the agreed-upon installment amount.
                        </p>
                      </div>

                      {/* Grace Period */}
                      <div className="space-y-2">
                        <label
                          htmlFor="grace-period"
                          className="block text-xs font-medium text-gray-700"
                        >
                          Grace period
                        </label>

                        <div className="relative">
                          <input
                            id="grace-period"
                            name="grace_period_days"
                            type="number"
                            value={formData.grace_period_days}
                            onChange={handleChange}
                            className="input-class w-full rounded-xl border-gray-200 bg-white/70 py-2.5 pl-3.5 pr-14 text-sm transition-all placeholder:text-gray-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5"
                          />

                          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-medium text-gray-400">
                            Days
                          </span>
                        </div>

                        <p className="text-xs leading-5 text-gray-400">
                          Number of days allowed after the due date before penalties apply.
                        </p>
                      </div>


                    </div>
                  </section>

                  {/* Footer */}
                  <div className="flex flex-col gap-4 border-t border-gray-200/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex max-w-xl items-start gap-2.5">
                      <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-gray-300" />

                      <p className="text-xs leading-5 text-gray-400">
                        These defaults apply only to{' '}
                        <strong className="font-semibold text-gray-600">
                          new loan agreements
                        </strong>
                        . Existing contracts retain their original terms.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="btn-submit inline-flex w-full shrink-0 items-center justify-center rounded-xl px-6 py-2.5 text-sm shadow-sm transition-all hover:-translate-y-0.5 sm:w-auto"
                    >
                      <Save className="mr-2 size-4" />
                      Save Defaults
                    </button>
                  </div>
                </form>
              </div>
            )}
            {/* Communications */}
            {activeTab === 'Communications' && (
              <div>
                <div className="mb-8 border-b border-gray-200/70 dark:border-border pb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary dark:border dark:border-primary/25">
                      <MessageSquare className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-semibold tracking-tight text-gray-950 dark:text-foreground">Communications</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-muted-foreground">SMS Gateway routing and automated notifications.</p>
                    </div>
                  </div>
                </div>
                <form className="space-y-7" onSubmit={(e) => { e.preventDefault(); confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); toast.success("Communications Updated"); }}>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-muted-foreground">SMS Sender ID</label>
                      <input type="text" defaultValue="ELELYONLTD" className="input-class w-full rounded-xl border-gray-200/80 bg-white/70 dark:border-border dark:bg-input dark:text-foreground focus:border-primary/40 focus:ring-4 focus:ring-primary/5" />
                    </div>
                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200/80 dark:border-border rounded-xl w-full bg-white/50 dark:bg-card">
                        <input type="checkbox" defaultChecked className="size-4 text-primary rounded border-gray-300 dark:border-border focus:ring-primary" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-foreground">Enable Automated Payment Reminders</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-muted-foreground">Default Overdue SMS Template</label>
                    <textarea rows={4} defaultValue="Dear {client_name}, your vehicle loan installment of KES {amount} was due on {due_date}. Please pay via Paybill 123456 A/c {car_reg} to avoid penalties. Ebenezar." className="input-class w-full resize-none rounded-xl border-gray-200/80 bg-white/70 dark:border-border dark:bg-input dark:text-foreground focus:border-primary/40 focus:ring-4 focus:ring-primary/5" />
                  </div>
                  <div className="flex items-center justify-end border-t border-gray-200/70 dark:border-border pt-6">
                    <button type="submit" className="btn-submit inline-flex w-auto items-center rounded-xl px-6 shadow-sm transition-all hover:-translate-y-0.5">
                      <Save className="mr-2 size-4" /> Save Preferences
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security */}
            {activeTab === 'Security' && (
              <div>
                <div className="mb-8 border-b border-gray-200/70 dark:border-border pb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary dark:border dark:border-primary/25">
                      <Shield className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-semibold tracking-tight text-gray-950 dark:text-foreground">Security</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-muted-foreground">Protect your account and organization data.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border border-gray-200/80 dark:border-border rounded-xl bg-white/50 dark:bg-card">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-foreground text-sm">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">Add an extra layer of security to your account.</p>
                    </div>
                    <button type="button" className="px-4 py-2 bg-gray-100 text-gray-900 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/80 font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200/80 dark:border-border rounded-xl bg-white/50 dark:bg-card">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-foreground text-sm">Change Password</p>
                      <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">Update your password regularly to keep your account secure.</p>
                    </div>
                    <button type="button" className="px-4 py-2 bg-gray-100 text-gray-900 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/80 font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors">
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Users & Permissions */}
            {activeTab === 'Users & Permissions' && (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
                <div className="size-16 bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary dark:border dark:border-primary/25 rounded-full flex items-center justify-center mb-6">
                  <Users className="size-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-2">User Management</h3>
                <p className="text-gray-500 dark:text-muted-foreground mb-8 max-w-md">Manage staff accounts, assign roles, and configure system permissions.</p>
                <a href="/users" className="btn-submit inline-flex w-auto items-center rounded-xl px-8 shadow-sm transition-all hover:-translate-y-0.5">
                  Go to Users Dashboard
                </a>
              </div>
            )}

            {/* Generic tabs (for Vehicles, Documents, Integrations) */}
            {!['Business', 'Appearance', 'Profile', 'Website', 'Financing', 'Communications', 'Security', 'Users & Permissions'].includes(activeTab) && (
              <div className="flex min-h-[460px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-gray-100/80 text-gray-400 dark:bg-white/5 dark:text-muted-foreground dark:border dark:border-white/10">
                  <SettingsPlaceholderIcon activeTab={activeTab} />
                </div>
                <h3 className="text-[18px] font-semibold tracking-tight text-gray-950 dark:text-foreground">
                  {activeTab} Settings
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-muted-foreground">
                  Configuration options for {activeTab.toLowerCase()} will
                  appear here in a future update.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}

/**
 * Small visual placeholder for tabs that haven't been implemented yet.
 * This does not alter any existing functionality.
 */
function SettingsPlaceholderIcon({
  activeTab,
}: {
  activeTab: string;
}) {
  const iconMap: Record<string, React.ElementType> = {
    Profile: User,
    Website: Globe,
    Vehicles: Car,
    Financing: CreditCard,
    Communications: MessageSquare,
    Documents: FileText,
    'Users & Permissions': Users,
    Integrations: LinkIcon,
    Security: Shield,
  };

  const Icon = iconMap[activeTab] ?? Palette;

  return <Icon className="size-5" />;
}