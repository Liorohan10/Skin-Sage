"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast"

interface ToastProps {
  id: string
  title: string
  description: string
  variant?: "default" | "destructive"
}

interface ToastContextType {
  toasts: ToastProps[]
  toast: (props: Omit<ToastProps, "id">) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextType>({
  toasts: [],
  toast: () => "",
  dismiss: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = (props: Omit<ToastProps, "id">) => {
    const id = Date.now().toString()
    const newToast = { ...props, id }
    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)

    return id
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Clean up toasts when component unmounts
  useEffect(() => {
    return () => {
      setToasts([])
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed top-0 z-[100] flex flex-col items-end gap-2 p-4 max-w-[420px] right-0">
        {toasts.map((toast) => (
          <Toast key={toast.id} variant={toast.variant} onDismiss={() => dismiss(toast.id)}>
            <ToastTitle>{toast.title}</ToastTitle>
            <ToastDescription>{toast.description}</ToastDescription>
          </Toast>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
