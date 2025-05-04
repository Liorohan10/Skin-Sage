"use client"

import type * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive"
  onDismiss?: () => void
}

export type ToastActionElement = React.ReactNode

export function Toast({ className, variant = "default", onDismiss, children, ...props }: ToastProps) {
  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
        variant === "default" && "bg-white border-gray-200",
        variant === "destructive" && "bg-red-50 border-red-200 text-red-800",
        className,
      )}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            "absolute right-2 top-2 rounded-md p-1",
            variant === "default" && "text-gray-500 hover:text-gray-900",
            variant === "destructive" && "text-red-300 hover:text-red-600",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function ToastTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm font-medium", className)} {...props} />
}

export function ToastDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm opacity-90", className)} {...props} />
}
