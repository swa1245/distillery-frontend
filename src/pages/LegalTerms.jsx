import { Link } from "react-router-dom";
import LegalDoc from "./LegalDoc";

export default function LegalTerms() {
  return (
    <LegalDoc title="Terms of Use" updated="19 August 2026">
      <p>
        These Terms govern use of Digital Distillery. By signing in, you agree to them.
      </p>
      <h2>The service</h2>
      <p>
        Digital Distillery is a workspace for ethanol plant operations, quality, and related
        records. You may use it only for lawful business purposes of your organisation.
      </p>
      <h2>Accounts</h2>
      <p>
        Keep your login confidential. Do not share credentials or attempt unauthorised access.
      </p>
      <h2>Privacy</h2>
      <p>
        How personal data is handled is described in our <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </LegalDoc>
  );
}
