import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ROLE_DASHBOARDS: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  PRINCIPAL: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  PARENT: "/parent/dashboard",
  ACCOUNTANT: "/accountant/dashboard",
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const dashboard = ROLE_DASHBOARDS[session.user.role] || "/login";
  redirect(dashboard);
}
