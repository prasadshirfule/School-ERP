import AppShell from "@/components/AppShell";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
