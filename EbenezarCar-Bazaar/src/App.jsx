import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ScrollToTop from "./components/ui/ScrollToTop";

// Route-level code splitting: each page is only downloaded when first visited
const Home = lazy(() => import("./pages/Home"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Contact = lazy(() => import("./pages/Contact"));
const TradeIn = lazy(() => import("./pages/TradeIn"));
const VehicleDetails = lazy(() => import("./pages/VehicleDetails"));
const VehicleDetailsHire = lazy(() => import("./pages/VehicleDetailsHire"));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center bg-brand-surface">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
      <p className="text-sm text-slate-400 font-medium">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ScrollToTop />
      <Navbar />

      <main className="flex-grow">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/vehicle/:id" element={<VehicleDetails />} />
            <Route path="/vehicle/hire/:id" element={<VehicleDetailsHire />} />
            <Route path="/trade-in" element={<TradeIn />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <SpeedInsights />
    </div>
  );
}

export default App;
