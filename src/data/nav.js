import {
  ArrowLeftRight,
  Cog,
  FlaskConical,
  TestTube2,
  Cylinder,
  FileSpreadsheet,
  LayoutDashboard,
  Warehouse,
} from "lucide-react";
import { DPR_NAV_ITEMS } from "./dprSections";

export const INWARD_OUTWARD_GROUPS = [
  {
    id: "inward",
    label: "Inward",
    items: [
      { label: "GATE ENTRY", path: "/inward-outward/gate-entry" },
      { label: "WEIGHTBRIDGE", path: "/inward-outward/weighbridge" },
      { label: "QC", path: "/inward-outward/qc" },
    ],
  },
  {
    id: "outward",
    label: "Outward",
    items: [
      { label: "Outward Dispatch", path: "/inward-outward/outward-dispatch" },
      { label: "Visitor Table", path: "/inward-outward/visits" },
    ],
  },
];

export const NAV_ITEMS = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    hint: "Plant overview",
  },
  {
    name: "Inward & Outward",
    path: "/inward-outward",
    icon: ArrowLeftRight,
    hint: "Receipts and dispatches",
    groups: INWARD_OUTWARD_GROUPS,
  },
  {
    name: "Store",
    path: "/store",
    icon: Warehouse,
    hint: "Inventory and stock operations",
    children: [
      { label: "Overview", path: "/store", end: true },
      { label: "Create Indent", path: "/store/indent" },
      { label: "Goods Receipt (GRN)", path: "/store/grn" },
      { label: "Issue Material", path: "/store/issue" },
      { label: "Stock Transfer", path: "/store/transfer" },
      { label: "Item Master", path: "/store/items" },
      { label: "Stock Adjustment", path: "/store/adjustment" },
    ],
  },
  {
    name: "Milling & Liquefaction",
    path: "/milling-liquefaction",
    icon: Cog,
    hint: "Flour grind and mash cook",
    children: [
      { label: "Overview", path: "/milling-liquefaction", end: true },
      { label: "Milling", path: "/milling-liquefaction/flour-analysis" },
      { label: "Liquefaction", path: "/milling-liquefaction/liquefaction" },
    ],
  },
  {
    name: "Fermentation",
    path: "/fermentation",
    icon: FlaskConical,
    hint: "Fermenter overview and analysis",
    children: [
      { label: "Overview", path: "/fermentation", end: true },
      { label: "Cell Culturing", path: "/fermentation/cell-culturing" },
      { label: "Analysis", path: "/fermentation/analysis" },
      { label: "Summary", path: "/fermentation/summary" },
      { label: "Performance & Analytics", path: "/fermentation/performance" },
    ],
  },
  {
    name: "Laboratory",
    path: "/laboratory",
    icon: TestTube2,
    hint: "Lab analysis and QC",
    children: [
      { label: "Overview", path: "/laboratory", end: true },
      { label: "Register", path: "/laboratory/register" },
    ],
  },
  {
    name: "Distillery",
    path: "/distillery",
    icon: Cylinder,
    hint: "Distillation overview and operating parameters",
    children: [
      { label: "Overview", path: "/distillery", end: true },
      { label: "Operating Parameters", path: "/distillery/operating-parameters" },
    ],
  },
  {
    name: "DPR",
    path: "/dpr",
    icon: FileSpreadsheet,
    hint: "Daily production report",
    children: DPR_NAV_ITEMS,
  },
];
