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
            <div className="w-9 h-9 rounded-full overflow-hidden border border-border bg-sidebar-accent flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all">
              {user?.avatarUrl ? (
                <Image 
                  src={user.avatarUrl} 
                  alt={user.firstName} 
                  width={36} 
                  height={36} 
                  className="w-full h-full object-cover rounded-full" 
                />
              ) : (
                <p className="text-13 font-bold text-foreground">
                  {user?.firstName?.[0] || 'U'}
                </p>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={14} className="text-xs">
            <p className="font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="text-muted-foreground">{user?.email}</p>
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center justify-center gap-1.5">
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleLogOut}
                aria-label="Log out"
                className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:scale-105 active:scale-95 transition-all shadow-xs"
              >
                <LogOut className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={14} className="text-xs font-medium">
              Log out
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <footer className="footer flex items-center justify-between w-full p-2 rounded-xl transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn(type === 'mobile' ? 'footer_name-mobile' : 'footer_name', 'overflow-hidden shrink-0')}>
          {user?.avatarUrl ? (
            <Image 
              src={user.avatarUrl} 
              alt={user.firstName} 
              width={36} 
              height={36} 
              className="w-full h-full object-cover rounded-full" 
            />
          ) : (
            <p className="text-14 font-bold text-gray-900 dark:text-[#F4F7F4]">
              {user?.firstName?.[0] || 'U'}
            </p>
          )}
        </div>
        <div className={cn(type === 'mobile' ? 'footer_email-mobile' : 'footer_email', 'min-w-0')}>
          <h1 className="text-13 truncate text-gray-900 dark:text-[#F4F7F4] font-semibold leading-tight">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-11 truncate font-medium text-gray-500 dark:text-[#A1ADA4] leading-tight">
            {user?.email}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogOut}
          title="Log out"
          aria-label="Log out"
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:scale-105 active:scale-95 transition-all shadow-xs"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </footer>
  );
}

export default Footer