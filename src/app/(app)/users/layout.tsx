import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "users:manage")) {
    redirect("/dashboard");
  }
  return children;
}
