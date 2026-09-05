import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminRoute from "@/components/AdminRoute";
import FloatingWhatsApp from "@/components/site/FloatingWhatsApp";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

// Route-level code splitting: the homepage is the landing page for almost all
// visitors, so every non-home page is fetched only when navigated to. Admin
// pulls in heavy dependencies (xlsx, charts) — it stays fully lazy.
const Adventures = lazy(() => import("./pages/Adventures.tsx"));
const TripDetail = lazy(() => import("./pages/TripDetail.tsx"));
const BookingPage = lazy(() => import("./pages/BookingPage.tsx"));
const Itinerary = lazy(() => import("./pages/Itinerary.tsx"));
const TrailLog = lazy(() => import("./pages/TrailLog.tsx"));
const UpcomingTreks = lazy(() => import("./pages/UpcomingTreks.tsx"));
const HyderabadTrails = lazy(() => import("./pages/HyderabadTrails.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));

const routeFallback = (
  <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
    Loading…
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={routeFallback}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/adventures" element={<Adventures />} />
            <Route path="/adventures/:trekId" element={<TripDetail />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route path="/itinerary/:trekId" element={<Itinerary />} />
            <Route path="/trail-log" element={<TrailLog />} />
            <Route path="/upcoming-treks" element={<UpcomingTreks />} />
            <Route path="/hyderabad-trails" element={<HyderabadTrails />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <FloatingWhatsApp />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;