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
    <AuthGuard>
      <SidebarProvider>
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        
        <SidebarInset>
          {/* Desktop Header - hidden on mobile */}
          <div className="hidden md:block">
            <Header />
          </div>

          {/* Mobile Header - simplified if needed, or just content */}
          {/* For now we just let content flow, MobileNav provides navigation */}
          
          <main className="flex-1 pb-20 md:pb-0">
            <Suspense fallback={<LoadingFallback />}>
              {children}
            </Suspense>
          </main>
        </SidebarInset>
        
        {/* Mobile Navigation - fixed bottom */}
        <MobileNav />
        
        <InstallPrompt />
      </SidebarProvider>
    </AuthGuard>
  );
}

