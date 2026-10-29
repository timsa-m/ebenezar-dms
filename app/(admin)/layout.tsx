import OfflineBanner from "@/components/OfflineBanner";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await getLoggedInUser();

  if (!loggedIn) redirect('/sign-in');
  if (loggedIn.userStatus !== 'active') redirect('/pending-approval');

  return (
    <div className="flex h-screen w-full bg-background antialiased selection:bg-accent/20 selection:text-accent overflow-hidden">
      <Sidebar user={loggedIn} />
      
      {/* Main Column */}
      <div className="flex size-full flex-col overflow-hidden relative">
        <OfflineBanner />
        
        {/* Main App Canvas — scrollable */}
        <main className="flex-1 overflow-y-auto relative z-10">
          {/* Subtle mesh background for premium feel */}
          <div className="absolute top-0 left-0 w-full h-[500px] bg-mesh-gradient pointer-events-none opacity-30 z-0"></div>

          <div className="relative z-10 min-h-full p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
