import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

export async function isAdminRequest() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}
