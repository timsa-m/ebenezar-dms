"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "group relative flex w-full cursor-default select-none items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
      "text-gray-700 outline-none transition-all duration-150",
      "focus:bg-gray-100 focus:text-gray-950",
      "data-[state=open]:bg-gray-100 data-[state=open]:text-gray-950",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-gray-500",
      "hover:[&_svg]:text-gray-700",
      inset && "pl-9",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto transition-transform duration-150 group-data-[state=open]:translate-x-0.5" />
  </DropdownMenuPrimitive.SubTrigger>
))

DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[190px] overflow-hidden rounded-xl border border-gray-200/80",
      "bg-white/95 p-1.5 text-gray-900 shadow-xl shadow-gray-900/10 backdrop-blur-xl",
      "ring-1 ring-black/[0.03]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      "data-[side=bottom]:slide-in-from-top-1.5",
      "data-[side=left]:slide-in-from-right-1.5",
      "data-[side=right]:slide-in-from-left-1.5",
      "data-[side=top]:slide-in-from-bottom-1.5",
      "origin-[--radix-dropdown-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))

DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))]",
        "min-w-[200px] overflow-y-auto overflow-x-hidden",
        "rounded-xl border border-gray-200/80",
        "bg-white/95 p-1.5 text-gray-900",
        "shadow-xl shadow-gray-900/10",
        "backdrop-blur-xl ring-1 ring-black/[0.03]",
        "scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-1.5",
        "data-[side=left]:slide-in-from-right-1.5",
        "data-[side=right]:slide-in-from-left-1.5",
        "data-[side=top]:slide-in-from-bottom-1.5",
        "origin-[--radix-dropdown-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))

DropdownMenuContent.displayName =
  DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center gap-2.5",
      "rounded-lg px-3 py-2 text-sm font-medium",
      "text-gray-700 outline-none",
      "transition-all duration-150",
      "focus:bg-gray-100 focus:text-gray-950",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "hover:bg-gray-100",
      "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      "[&_svg]:text-gray-500",
      "hover:[&_svg]:text-gray-700",
      inset && "pl-9",
      className
    )}
    {...props}
  />
))

DropdownMenuItem.displayName =
  DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-lg",
      "py-2 pl-9 pr-3 text-sm font-medium",
      "text-gray-700 outline-none",
      "transition-colors duration-150",
      "focus:bg-gray-100 focus:text-gray-950",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4 stroke-[2.5] text-gray-900" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>

    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))

DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-lg",
      "py-2 pl-9 pr-3 text-sm font-medium",
      "text-gray-700 outline-none",
      "transition-colors duration-150",
      "focus:bg-gray-100 focus:text-gray-950",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      className
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2.5 w-2.5 fill-current text-gray-900" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>

    {children}
  </DropdownMenuPrimitive.RadioItem>
))

DropdownMenuRadioItem.displayName =
  DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-3 py-2 text-[11px] font-semibold uppercase tracking-wider",
      "text-gray-400",
      inset && "pl-9",
      className
    )}
    {...props}
  />
))

DropdownMenuLabel.displayName =
  DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn(
      "mx-1 my-1.5 h-px bg-gray-100",
      className
    )}
    {...props}
  />
))

DropdownMenuSeparator.displayName =
  DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto rounded-md bg-gray-100 px-1.5 py-0.5",
        "text-[10px] font-medium tracking-wide text-gray-400",
        className
      )}
      {...props}
    />
  )
}

DropdownMenuShortcut.displayName =
  "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
