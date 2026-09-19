import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <Topbar />
      <main className="main-content">{children}</main>
    </>
  );
}
