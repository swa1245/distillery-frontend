import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import DashboardLayout from "./layout/DashboardLayout";
import Auth from "./pages/Auth";
import LegalPrivacy from "./pages/LegalPrivacy";
import LegalTerms from "./pages/LegalTerms";
import GrainReceivingPage from "./pages/GrainReceivingPage";
import GrainTablePage from "./pages/GrainTablePage";
import MillingPage from "./pages/MillingPage";
import MillingFlourAnalysisPage from "./pages/MillingFlourAnalysisPage";
import LiquefactionAnalysisPage from "./pages/LiquefactionAnalysisPage";
import CellCulturingPage from "./pages/CellCulturingPage";
import FermentationOverviewPage from "./pages/FermentationOverviewPage";
import FermentationAnalysisPage from "./pages/FermentationAnalysisPage";
import FermenterSummaryPage from "./pages/FermenterSummaryPage";
import FermentationPerformancePage from "./pages/FermentationPerformancePage";
import DistillationPortalPage from "./pages/DistillationPortalPage";
import DistillationOperatingPage from "./pages/DistillationOperatingPage";
import PlantDashboardPage from "./pages/PlantDashboardPage";
import LabOverviewPage from "./pages/LabOverviewPage";
import LabRegisterPage from "./pages/LabRegisterPage";
import DprOverviewPage from "./pages/DprOverviewPage";
import DprSectionPage from "./pages/DprSectionPage";
import StoreOverviewPage from "./pages/StoreOverviewPage";
import StoreSheetPage from "./pages/StoreSheetPage";
import OutwardDispatchPage from "./pages/OutwardDispatchPage";
import VisitorTablePage from "./pages/VisitorTablePage";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-250">
        <p className="text-sm font-bold text-stone-500">Loading workspace…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <DashboardLayout />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function RoutesConfig() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Auth />
          </PublicOnly>
        }
      />
      <Route path="/privacy" element={<LegalPrivacy />} />
      <Route path="/terms" element={<LegalTerms />} />
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<PlantDashboardPage />} />
        <Route path="inward-outward" element={<GrainReceivingPage />} />
        <Route path="inward-outward/gate-entry" element={<GrainTablePage stage="gate" />} />
        <Route path="inward-outward/weighbridge" element={<GrainTablePage stage="weigh" />} />
        <Route path="inward-outward/qc" element={<GrainTablePage stage="qc" />} />
        <Route path="inward-outward/grain" element={<Navigate to="/inward-outward/gate-entry" replace />} />
        <Route path="inward-outward/other-material" element={<Navigate to="/inward-outward/gate-entry" replace />} />
        <Route path="inward-outward/product" element={<OutwardDispatchPage />} />
        <Route path="inward-outward/outward-dispatch" element={<OutwardDispatchPage />} />
        <Route path="inward-outward/visits" element={<VisitorTablePage />} />
        <Route path="inward-outward/inward-register" element={<Navigate to="/inward-outward/gate-entry" replace />} />
        <Route path="inward-outward/outward-register" element={<Navigate to="/inward-outward" replace />} />
        <Route path="store" element={<StoreOverviewPage />} />
        <Route path="store/indent" element={<StoreSheetPage sheetId="indent" />} />
        <Route path="store/grn" element={<StoreSheetPage sheetId="grn" />} />
        <Route path="store/issue" element={<StoreSheetPage sheetId="issue" />} />
        <Route path="store/transfer" element={<StoreSheetPage sheetId="transfer" />} />
        <Route path="store/items" element={<StoreSheetPage sheetId="items" />} />
        <Route path="store/adjustment" element={<StoreSheetPage sheetId="adjustment" />} />
        <Route path="store/stock" element={<StoreSheetPage sheetId="stock" />} />
        <Route path="store/alerts" element={<StoreSheetPage sheetId="alerts" />} />
        <Route path="store/expiry" element={<StoreSheetPage sheetId="expiry" />} />
        <Route path="milling-liquefaction" element={<MillingPage />} />
        <Route path="milling-liquefaction/flour-analysis" element={<MillingFlourAnalysisPage />} />
        <Route path="milling-liquefaction/liquefaction" element={<LiquefactionAnalysisPage />} />
        <Route path="cell-culturing" element={<Navigate to="/fermentation/cell-culturing" replace />} />
        <Route path="fermentation" element={<FermentationOverviewPage />} />
        <Route path="fermentation/cell-culturing" element={<CellCulturingPage />} />
        <Route path="fermentation/analysis" element={<FermentationAnalysisPage />} />
        <Route path="fermentation/summary" element={<FermenterSummaryPage />} />
        <Route path="fermentation/performance" element={<FermentationPerformancePage />} />
        <Route path="fermenter-summary" element={<Navigate to="/fermentation/summary" replace />} />
        <Route path="live-status" element={<Navigate to="/dashboard" replace />} />
        <Route path="laboratory" element={<LabOverviewPage />} />
        <Route path="laboratory/register" element={<LabRegisterPage />} />
        <Route path="distillery" element={<DistillationPortalPage />} />
        <Route path="distillery/operating-parameters" element={<DistillationOperatingPage />} />
        <Route path="distillery/ethanol-analysis" element={<Navigate to="/distillery" replace />} />
        <Route path="dpr" element={<DprOverviewPage />} />
        <Route path="dpr/liquefaction-fermentation" element={<DprSectionPage sectionId="liquefaction-fermentation" />} />
        <Route path="dpr/distillation" element={<DprSectionPage sectionId="distillation" />} />
        <Route path="dpr/evaporation" element={<DprSectionPage sectionId="evaporation" />} />
        <Route path="dpr/decanter-solids" element={<DprSectionPage sectionId="decanter-solids" />} />
        <Route path="dpr/chemical-consumption" element={<DprSectionPage sectionId="chemical-consumption" />} />
        <Route path="dpr/utilities" element={<DprSectionPage sectionId="utilities" />} />
        <Route path="dpr/water-consumption" element={<DprSectionPage sectionId="water-consumption" />} />
        <Route path="dpr/electricity-consumption" element={<DprSectionPage sectionId="electricity-consumption" />} />
        <Route path="dpr/plant-running-hours" element={<DprSectionPage sectionId="plant-running-hours" />} />

        <Route path="grain-receiving" element={<Navigate to="/inward-outward" replace />} />
        <Route path="grain-receiving/inward-register" element={<Navigate to="/inward-outward/gate-entry" replace />} />
        <Route path="process" element={<Navigate to="/milling-liquefaction" replace />} />
        <Route path="process/liquefaction" element={<Navigate to="/milling-liquefaction/liquefaction" replace />} />
        <Route path="process/fermentation" element={<Navigate to="/fermentation" replace />} />
        <Route path="liquefaction" element={<Navigate to="/milling-liquefaction/liquefaction" replace />} />
        <Route path="milling" element={<Navigate to="/milling-liquefaction" replace />} />
        <Route path="milling/flour-analysis" element={<Navigate to="/milling-liquefaction/flour-analysis" replace />} />
        <Route path="distillation" element={<Navigate to="/distillery" replace />} />
        <Route path="distillation/ethanol-analysis" element={<Navigate to="/distillery" replace />} />
        <Route path="qc" element={<Navigate to="/laboratory" replace />} />
        <Route path="documentation" element={<Navigate to="/dpr" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
