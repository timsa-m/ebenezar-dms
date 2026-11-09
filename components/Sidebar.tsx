'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Footer from './Footer'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Warehouse,
  FileSignature,
  ContactRound,
  Globe,
  ChartNoAxesColumnIncreasing,
  MessagesSquare,
  Inbox,
  Scale,
  Receipt,
  UsersRound,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  '/': LayoutDashboard,
  '/vehicles': Warehouse,
  '/loans': FileSignature,
  '/clients': ContactRound,
  '/reports': ChartNoAxesColumnIncreasing,
  '/communications': MessagesSquare,
  '/website-leads': Inbox,
  '/documents': Scale,
  '/expenses': Receipt,
  '/users': UsersRound,
  '/settings': SlidersHorizontal,
}

const PROD_WEBSITE_URL =
  process.env.NEXT_PUBLIC_WEBSITE_URL && !process.env.NEXT_PUBLIC_WEBSITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_WEBSITE_URL
    : 'https://ebenezarenterprises.com'

const LOCAL_WEBSITE_URL =
  process.env.NEXT_PUBLIC_DEV_WEBSITE_URL || 'http://localhost:5173'

export const getWebsiteUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local')
    return isLocal ? LOCAL_WEBSITE_URL : PROD_WEBSITE_URL
  }
  return process.env.NODE_ENV === 'production' ? PROD_WEBSITE_URL : LOCAL_WEBSITE_URL
}

const getNavIcon = (route: string, label: string): React.ElementType => {
  if (label === 'Website' || route.startsWith('http://') || route.startsWith('https://')) {
    return Globe
  }
  return iconMap[route] || LayoutDashboard
}

interface NavItemProps {
  href: string
  label: string
  icon: React.ElementType
  isActive: boolean
  isCollapsed: boolean
  isExternal?: boolean
  onClick?: () => void
}

const NavItem = ({
  href,
  label,
  icon: Icon,
  isActive,
  isCollapsed,
  isExternal,
  onClick,
}: NavItemProps) => {
  const isLinkExternal = isExternal || label === 'Website' || href.startsWith('http://') || href.startsWith('https://')

  const LinkComponent = isLinkExternal ? 'a' : Link

  const linkProps = isLinkExternal
    ? {
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        onClick,
      }
    : {
        href,
        onClick,
      }

  const linkContent = (
    <LinkComponent
      {...(linkProps as any)}
      className={cn(
        'sidebar-link group flex items-center transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isCollapsed
          ? 'justify-center size-11 mx-auto p-0 rounded-xl hover:translate-x-0 shrink-0'
          : 'gap-3 px-3 py-2.5 rounded-xl',
        isActive && 'sidebar-link-active'
      )}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={cn(
          'sidebar-icon shrink-0 w-[18px] h-[18px] transition-colors',
          isActive && 'text-current'
        )}
        strokeWidth={1.8}
      />
      {isCollapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="sidebar-label font-medium text-sm truncate">{label}</span>
      )}
    </LinkComponent>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={14} className="font-medium text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname()

  // Desktop collapsed preference persistence
  const userKey = user?.userId || user?.$id || 'default'
  const storageKey = `elelyon-sidebar-collapsed_${userKey}`
  const fallbackKey = 'elelyon-sidebar-collapsed'

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [mounted, setMounted] = useState<boolean>(false)
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)

  // Load persisted desktop preference safely on client mount
  useEffect(() => {
    setMounted(true)
    try {
      const userPref = localStorage.getItem(storageKey)
      if (userPref !== null) {
        setIsCollapsed(userPref === 'true')
      } else {
        const fallbackPref = localStorage.getItem(fallbackKey)
        if (fallbackPref !== null) {
          setIsCollapsed(fallbackPref === 'true')
        } else if (window.innerWidth < 1024 && window.innerWidth >= 768) {
          // Default to compact icon sidebar on tablet viewports
          setIsCollapsed(true)
        }
      }
    } catch {
      /* ignore localStorage errors */
    }
  }, [storageKey, fallbackKey])

  // Toggle collapsed state and persist to localStorage
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, String(next))
        localStorage.setItem(fallbackKey, String(next))
      } catch {
        /* noop */
      }
      return next
    })
  }, [storageKey, fallbackKey])

  // Keyboard shortcut: Ctrl+B / Cmd+B to toggle desktop sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleCollapsed])

  // Mobile drawer: close on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Mobile drawer: close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  // Mobile drawer: body scroll lock when open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // Resolve current website URL based on environment (localhost vs production)
  const [websiteUrl, setWebsiteUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const isLocal =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.endsWith('.local')
      return isLocal ? LOCAL_WEBSITE_URL : PROD_WEBSITE_URL
    }
    return process.env.NODE_ENV === 'production' ? PROD_WEBSITE_URL : LOCAL_WEBSITE_URL
  })

  useEffect(() => {
    setWebsiteUrl(getWebsiteUrl())
  }, [])

  // Filter links according to role permissions and resolve dynamic website URL
  const navItems = useMemo(() => {
    return sidebarLinks
      .filter((item) => {
        if (user?.role === 'STAFF') {
          return item.route !== '/' && item.route !== '/reports'
        }
        return true
      })
      .map((item) => {
        const isWebsite = item.label === 'Website'
        const href = isWebsite ? websiteUrl : item.route
        const isExternal = isWebsite || href.startsWith('http://') || href.startsWith('https://')
        return {
          ...item,
          href,
          isExternal,
        }
      })
  }, [user?.role, websiteUrl])

  // Route active helper
  const checkIsActive = useCallback(
    (route: string) => {
      if (route.startsWith('http://') || route.startsWith('https://')) return false
      if (route === '/') return pathname === '/'
      return pathname === route || pathname.startsWith(`${route}/`)
    },
    [pathname]
  )

  return (
    <TooltipProvider delayDuration={150}>
      {/* ── Mobile Menu Trigger Button (visible only on mobile < md) ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="print:hidden fixed top-3 left-3 z-40 md:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-sidebar-border bg-sidebar/95 backdrop-blur-md shadow-md text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open Navigation Menu"
        aria-expanded={mobileOpen}
      >
        <Menu className="w-5 h-5 text-sidebar-foreground" />
      </button>

      {/* ── Mobile Drawer Backdrop Overlay ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="print:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Off-Canvas Navigation Drawer (< md) ── */}
      <aside
        className={cn(
          'print:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-[280px] max-w-[85vw] bg-sidebar border-r border-sidebar-border shadow-2xl transition-transform duration-300 ease-in-out md:hidden p-3.5',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        {/* Mobile Header: Brand & Dedicated Close Control */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-sidebar-border/60 shrink-0">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="sidebar-brand flex items-center gap-2.5 p-1 rounded-xl"
          >
            <div className="sidebar-logo shrink-0 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center">
              <Image
                src="/icons/logo.png"
                alt="Ebenezar Logo"
                width={36}
                height={36}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <div className="sidebar-brand-info flex flex-col min-w-0">
              <span className="sidebar-brand-name font-bold text-sm leading-tight truncate">
                Ebenezar
              </span>
              <span className="sidebar-brand-tagline text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Car Bazaar
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <nav className="sidebar-nav flex-1 overflow-y-auto space-y-1 py-1">
          {navItems.map((item) => {
            const isActive = checkIsActive(item.href)
            const Icon = getNavIcon(item.href, item.label)

            return (
              <NavItem
                key={item.label}
                href={item.href}
                label={item.label}
                icon={Icon}
                isActive={isActive}
                isCollapsed={false}
                isExternal={item.isExternal}
                onClick={() => setMobileOpen(false)}
              />
            )
          })}
        </nav>

        {/* Mobile Management Links */}
        <div className="border-t border-sidebar-border/60 pt-2 pb-2 shrink-0 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
            Management
          </div>

          {user?.role === 'ADMIN' && (
            <NavItem
              href="/users"
              label="User Management"
              icon={UsersRound}
              isActive={pathname === '/users' || pathname.startsWith('/users/')}
              isCollapsed={false}
              onClick={() => setMobileOpen(false)}
            />
          )}

          <NavItem
            href="/settings"
            label="Settings"
            icon={SlidersHorizontal}
            isActive={pathname === '/settings' || pathname.startsWith('/settings/')}
            isCollapsed={false}
            onClick={() => setMobileOpen(false)}
          />
        </div>

        {/* Mobile Footer */}
        <div className="border-t border-sidebar-border/60 pt-2 shrink-0">
          <Footer user={user} type="mobile" collapsed={false} />
        </div>
      </aside>

      {/* ── Desktop & Tablet Sidebar (>= md) ── */}
      <aside
        style={{
          width: isCollapsed ? '80px' : '256px',
          minWidth: isCollapsed ? '80px' : '256px',
          maxWidth: isCollapsed ? '80px' : '256px',
        }}
        className={cn(
          'sidebar print:hidden hidden md:flex flex-col h-screen sticky top-0 shrink-0 z-30 select-none overflow-x-hidden border-r border-sidebar-border bg-sidebar',
          isCollapsed ? 'sidebar-collapsed px-2 py-3.5' : 'px-3 py-3.5',
          mounted ? 'transition-[width,padding] duration-300 ease-in-out' : ''
        )}
        aria-label="Main sidebar navigation"
      >
        {/* Brand Header: Logo + Title + Collapse/Expand Toggle */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2.5 pb-2.5 mb-2.5 border-b border-sidebar-border/60 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/"
                  className="sidebar-logo w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 hover:ring-2 hover:ring-primary/40 transition-all"
                >
                  <Image
                    src="/icons/logo.png"
                    alt="Ebenezar Logo"
                    width={40}
                    height={40}
                    priority
                    className="w-full h-full object-contain"
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs">
                Ebenezar Enterprises Car Bazaar
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  aria-label="Expand sidebar"
                  aria-expanded={false}
                  className="flex size-9 items-center justify-center rounded-xl border border-sidebar-border/80 bg-sidebar-accent/50 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:border-sidebar-border hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer group"
                >
                  <PanelLeftOpen className="w-[18px] h-[18px] transition-transform group-hover:translate-x-0.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={14} className="font-medium text-xs">
                Expand sidebar (Ctrl+B)
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-1 pb-3 mb-2 border-b border-sidebar-border/60 shrink-0">
            <Link
              href="/"
              className="sidebar-brand flex items-center gap-2.5 p-1 rounded-xl min-w-0 group hover:opacity-90 transition-opacity"
            >
              <div className="sidebar-logo shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                <Image
                  src="/icons/logo.png"
                  alt="Ebenezar Logo"
                  width={40}
                  height={40}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="sidebar-brand-info flex flex-col min-w-0">
                <span className="sidebar-brand-name font-bold text-sm leading-tight truncate">
                  Ebenezar
                </span>
                <span className="sidebar-brand-tagline text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Car Bazaar
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              aria-expanded={true}
              title="Collapse sidebar (Ctrl+B)"
              className="flex size-8 items-center justify-center rounded-lg border border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:border-sidebar-border/60 transition-all shrink-0 cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary Navigation Links */}
        <nav className="sidebar-nav flex-1 overflow-y-auto overflow-x-hidden space-y-1 py-1 px-0.5">
          {navItems.map((item) => {
            const isActive = checkIsActive(item.href)
            const Icon = getNavIcon(item.href, item.label)

            return (
              <NavItem
                key={item.label}
                href={item.href}
                label={item.label}
                icon={Icon}
                isActive={isActive}
                isCollapsed={isCollapsed}
                isExternal={item.isExternal}
              />
            )
          })}
        </nav>

        {/* Management & Tools Section */}
        <div
          className={cn(
            'border-t border-sidebar-border/60 pt-2 pb-2 shrink-0 space-y-1',
            isCollapsed ? 'px-0' : 'px-0.5'
          )}
        >
          {!isCollapsed && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
              Management
            </div>
          )}

          {user?.role === 'ADMIN' && (
            <NavItem
              href="/users"
              label="User Management"
              icon={UsersRound}
              isActive={pathname === '/users' || pathname.startsWith('/users/')}
              isCollapsed={isCollapsed}
            />
          )}

          <NavItem
            href="/settings"
            label="Settings"
            icon={SlidersHorizontal}
            isActive={pathname === '/settings' || pathname.startsWith('/settings/')}
            isCollapsed={isCollapsed}
          />
        </div>

        {/* Sidebar Footer Wrapper: User Profile, ThemeToggle, Log out */}
        <div
          className={cn(
            'border-t border-sidebar-border/60 pt-2 mt-auto shrink-0',
            isCollapsed ? 'px-0' : 'px-1'
          )}
        >
          <Footer user={user} collapsed={isCollapsed} />
        </div>
      </aside>
    </TooltipProvider>
  )
}

export default Sidebar