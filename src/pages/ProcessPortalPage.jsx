import { useNavigate } from "react-router-dom";
import { Droplets, FlaskConical, FileSpreadsheet } from "lucide-react";
import PortalModuleCard, { PORTAL_GRID_CLASS } from "../components/PortalModuleCard";
import PortalPageHeader, { PORTAL_PAGE_CLASS } from "../components/PortalPageHeader";

const MODULES = [
  {
    title: "Liquefaction Analysis Report",
    description: "2-hour mash cook log — pH, temperature, DS %, and enzyme tanks.",
    icon: Droplets,
    path: "/process/liquefaction",
    meta: "Cook",
  },
  {
    title: "Fermenter Report",
    description: "Pre-fermenter and fermenters — pH, gravity, RS %, alcohol, VA, and cell count.",
    icon: FlaskConical,
    path: "/process/fermentation",
    meta: "Wash",
  },
];

export default function ProcessPortalPage() {
  const navigate = useNavigate();

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PortalPageHeader
        icon={FileSpreadsheet}
        title="Liquefaction & Fermentation"
        subtitle="Mash cook and fermenter analysis on the same 2-hour plant grid"
        countLabel={`${MODULES.length} reports`}
      />

      <section className={PORTAL_GRID_CLASS}>
        {MODULES.map((mod) => (
          <PortalModuleCard
            key={mod.path}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            meta={mod.meta}
            onClick={() => navigate(mod.path)}
          />
        ))}
      </section>
    </div>
  );
}
