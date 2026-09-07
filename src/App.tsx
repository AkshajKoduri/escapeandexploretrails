import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdminRoute from "@/components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteFocus from "@/components/RouteFocus";
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
const Sonner = lazy(() =>
  import("@/components/ui/sonner").then((module) => ({ default: module.Toaster })),
);

const routeFallback = (
  <main data-route-fallback id="main-content" tabIndex={-1} className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground outline-none">
    Loading…
  </main>
);

const App = () => (
  <>
    <Suspense fallback={null}>
      <Sonner />
    </Suspense>
    <BrowserRouter>
      <RouteFocus />
      <ErrorBoundary>
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
      </ErrorBoundary>
      <FloatingWhatsApp />
    </BrowserRouter>
  </>
);

export default App;
