'use client'

import { logoutAccount } from '@/lib/actions/user.actions'
import Image from "next/image"
import { useRouter } from 'next/navigation'
import React from 'react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { LogOut } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const Footer = ({ user, type = 'desktop', collapsed = false }: FooterProps) => {
  const router = useRouter();

  const handleLogOut = async () => {
    const loggedOut = await logoutAccount();
    if (loggedOut) router.push('/sign-in')
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2.5 w-full py-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-sidebar-accent flex items-center justify-center shrink-0 cursor-default hover:ring-2 hover:ring-primary/40 transition-all">
              {user?.avatarUrl ? (
                <Image 
                  src={user.avatarUrl} 
                  alt={user.firstName} 
                  width={40} 
                  height={40} 
                  className="w-full h-full object-cover rounded-full" 
                />
              ) : (
                <p className="text-14 font-bold text-foreground">
                  {user?.firstName?.[0] || 'U'}
                </p>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={14} className="text-xs">
            <p className="font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="text-muted-foreground">{user?.email}</p>
            {user?.role && (
              <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-primary/10 text-primary">
                {user.role}
              </span>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleLogOut}
              aria-label="Log out"
              className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={14} className="text-xs font-medium">
            Log out
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 w-full p-2.5 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/30 dark:bg-sidebar-accent/20">
      {/* User identity row */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-sidebar-accent flex items-center justify-center shrink-0">
          {user?.avatarUrl ? (
            <Image 
              src={user.avatarUrl} 
              alt={user.firstName} 
              width={40} 
              height={40} 
              className="w-full h-full object-cover rounded-full" 
            />
          ) : (
            <p className="text-14 font-bold text-foreground">
              {user?.firstName?.[0] || 'U'}
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-13 font-bold text-sidebar-foreground truncate leading-tight">
              {user?.firstName} {user?.lastName}
            </h1>
            {user?.role && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-primary/10 text-primary shrink-0 leading-none">
                {user.role}
              </span>
            )}
          </div>
          <p className="text-11 font-medium text-muted-foreground truncate leading-tight mt-0.5" title={user?.email}>
            {user?.email}
          </p>
        </div>
      </div>

      {/* Action controls row */}
      <div className="flex items-center justify-between pt-2 border-t border-sidebar-border/60 text-xs">
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <span className="text-[11px] font-medium text-muted-foreground">Theme</span>
        </div>
        <button
          type="button"
          onClick={handleLogOut}
          title="Log out"
          aria-label="Log out"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:border-sidebar-border/60 transition-all cursor-pointer"
        >
          <LogOut className="size-3.5" />
          <span className="text-[11px] font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
}

export default Footer