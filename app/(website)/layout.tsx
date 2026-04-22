import type { ReactNode } from "react";

import Footer from "@/components/website/layout/Footer";
import Navbar from "@/components/website/layout/Navbar";

export default function WebsiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
