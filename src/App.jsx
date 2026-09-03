import { BrowserRouter } from "react-router-dom";
import RoutesConfig from "./routes";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoutesConfig />
      </BrowserRouter>
    </AuthProvider>
  );
}
