import { Link } from "react-router-dom";
import LegalDoc from "./LegalDoc";

export default function LegalPrivacy() {
  return (
    <LegalDoc title="Privacy Policy" updated="19 August 2026">
      <p>
        This policy explains how personal data is handled in Digital Distillery, in line with
        India’s Digital Personal Data Protection Act, 2023 (DPDP Act).
      </p>
      <h2>Who is responsible</h2>
      <p>
        Your organisation is the <strong>Data Fiduciary</strong> for records it enters. This
        software processes that data only to run the product.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Login details: name, email, organisation, role</li>
        <li>Usage needed to provide the product (sessions, security logs)</li>
        <li>Data your organisation stores in Digital Distillery</li>
      </ul>
      <h2>How we use it</h2>
      <p>
        Personal data is used only to authenticate users, provide the product, support your
        organisation, keep the system secure, and meet legal duties. Personal data is not sold.
      </p>
      <p>
        Also see our <Link to="/terms">Terms of Use</Link>.
      </p>
    </LegalDoc>
  );
}
