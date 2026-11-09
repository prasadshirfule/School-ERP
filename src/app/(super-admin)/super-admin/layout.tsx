import AppShell from "@/components/AppShell";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
