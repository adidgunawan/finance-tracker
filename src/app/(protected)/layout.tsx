import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { MobileNav } from "@/components/layout/MobileNav";

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
    <SidebarProvider>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        {/* Sidebar content doesn't need strict auth blocking for UI shell, 
            data inside it will handle its own loading/auth states */}
        <AppSidebar />
      </div>
      
      <SidebarInset>
        {/* Desktop Header */}
        <div className="hidden md:block">
          <Header />
        </div>

        <main className="flex-1 pb-20 md:pb-0">
          {/* AuthGuard now only blocks the main content */}
          <Suspense fallback={<LoadingFallback />}>
            <AuthGuard>
              {children}
            </AuthGuard>
          </Suspense>
        </main>
      </SidebarInset>
      
      <InstallPrompt />
      
      {/* Mobile Navigation */}
      <MobileNav />
    </SidebarProvider>
  );
}

