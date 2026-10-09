"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, GraduationCap, Users, School, Receipt, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "Student" | "Teacher" | "Class" | "Invoice";
}

export default function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    students: SearchResultItem[];
    teachers: SearchResultItem[];
    classes: SearchResultItem[];
    invoices: SearchResultItem[];
  }>({
    students: [],
    teachers: [],
    classes: [],
    invoices: [],
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ students: [], teachers: [], classes: [], invoices: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ students: [], teachers: [], classes: [], invoices: [] });
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const totalResults =
    results.students.length +
    results.teachers.length +
    results.classes.length +
    results.invoices.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderRadius: "8px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid var(--border-color)",
          color: "var(--text-secondary)",
          fontSize: "0.85rem",
          cursor: "pointer",
        }}
      >
        <Search size={14} />
        <span>Quick Search...</span>
        <kbd
          style={{
            fontSize: "0.7rem",
            padding: "2px 5px",
            borderRadius: "4px",
            background: "rgba(255, 255, 255, 0.1)",
            color: "var(--text-muted)",
            fontFamily: "monospace",
          }}
        >
          ⌘K
        </kbd>
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "12vh",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "580px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "14px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid #1e293b",
                gap: "12px",
              }}
            >
              <Search size={18} color="#94a3b8" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students, roll numbers, teachers, classes, invoices..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                }}
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: "380px", overflowY: "auto", padding: "8px 0" }}>
              {query.length >= 2 && totalResults === 0 && !loading && (
                <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
                  No matching records found for "{query}".
                </div>
              )}

              {results.students.length > 0 && (
                <div>
                  <div style={{ padding: "6px 16px", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                    Students
                  </div>
                  {results.students.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.href)}
                      style={{
                        padding: "8px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                      }}
                      className="search-item-hover"
                    >
                      <GraduationCap size={16} color="#fb7185" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "#f8fafc" }}>{item.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{item.subtitle}</div>
                      </div>
                      <ArrowRight size={14} color="#64748b" />
                    </div>
                  ))}
                </div>
              )}

              {results.teachers.length > 0 && (
                <div>
                  <div style={{ padding: "6px 16px", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                    Teachers & Staff
                  </div>
                  {results.teachers.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.href)}
                      style={{
                        padding: "8px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                      }}
                      className="search-item-hover"
                    >
                      <Users size={16} color="#38bdf8" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "#f8fafc" }}>{item.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{item.subtitle}</div>
                      </div>
                      <ArrowRight size={14} color="#64748b" />
                    </div>
                  ))}
                </div>
              )}

              {results.classes.length > 0 && (
                <div>
                  <div style={{ padding: "6px 16px", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                    Classes
                  </div>
                  {results.classes.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.href)}
                      style={{
                        padding: "8px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                      }}
                      className="search-item-hover"
                    >
                      <School size={16} color="#34d399" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "#f8fafc" }}>{item.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{item.subtitle}</div>
                      </div>
                      <ArrowRight size={14} color="#64748b" />
                    </div>
                  ))}
                </div>
              )}

              {results.invoices.length > 0 && (
                <div>
                  <div style={{ padding: "6px 16px", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                    Fee Invoices
                  </div>
                  {results.invoices.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.href)}
                      style={{
                        padding: "8px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                      }}
                      className="search-item-hover"
                    >
                      <Receipt size={16} color="#fbbf24" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "#f8fafc" }}>{item.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{item.subtitle}</div>
                      </div>
                      <ArrowRight size={14} color="#64748b" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                padding: "8px 16px",
                background: "#0b1120",
                borderTop: "1px solid #1e293b",
                fontSize: "0.75rem",
                color: "#64748b",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Press <kbd style={{ fontFamily: "monospace" }}>ESC</kbd> to close</span>
              <span>Search across all school records</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
