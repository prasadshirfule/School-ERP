"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  addToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 4000) => {
      showToast(message, type, title, duration);
    },
    [showToast]
  );

  const success = useCallback((message: string, title?: string) => showToast(message, "success", title), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast(message, "error", title), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast(message, "info", title), [showToast]);
  const warning = useCallback((message: string, title?: string) => showToast(message, "warning", title), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, addToast, success, error, info, warning, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "400px",
        width: "calc(100vw - 48px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "14px 16px",
            borderRadius: "10px",
            background:
              toast.type === "success"
                ? "#064e3b"
                : toast.type === "error"
                ? "#7f1d1d"
                : toast.type === "warning"
                ? "#78350f"
                : "#1e293b",
            color: "#ffffff",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
            border: `1px solid ${
              toast.type === "success"
                ? "#059669"
                : toast.type === "error"
                ? "#dc2626"
                : toast.type === "warning"
                ? "#d97706"
                : "#475569"
            }`,
            animation: "slideIn 0.25s ease-out",
          }}
        >
          <div style={{ marginTop: "2px", flexShrink: 0 }}>
            {toast.type === "success" && <CheckCircle2 size={18} color="#34d399" />}
            {toast.type === "error" && <AlertCircle size={18} color="#f87171" />}
            {toast.type === "warning" && <AlertTriangle size={18} color="#fbbf24" />}
            {toast.type === "info" && <Info size={18} color="#60a5fa" />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {toast.title && (
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "2px" }}>
                {toast.title}
              </div>
            )}
            <div style={{ fontSize: "0.85rem", opacity: 0.95, wordBreak: "break-word" }}>
              {toast.message}
            </div>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              opacity: 0.7,
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
