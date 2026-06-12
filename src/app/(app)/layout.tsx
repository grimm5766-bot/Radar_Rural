import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, lida: false },
  });
  return (
    <AppShell user={user} unreadNotifications={unreadNotifications}>
      {children}
    </AppShell>
  );
}
