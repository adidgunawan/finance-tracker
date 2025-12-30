import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1">
            <Suspense fallback={<LoadingFallback />}>
              {children}
            </Suspense>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}

