"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Cargando } from "@/components/ui/Spinner";
import DashboardNav from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Cargando>Cargando su panel…</Cargando>
      </main>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardNav />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
