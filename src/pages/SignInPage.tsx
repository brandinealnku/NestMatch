import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AuthChoices } from "../components/auth/AuthChoices";

export function SignInPage() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.user) {
    const destination = auth.profile?.displayName.trim() ? (location.state as { from?: string } | null)?.from || "/groups" : "/profile";
    return <Navigate to={destination} replace />;
  }
  return <section className="panel narrow auth-panel"><p className="eyebrow">Private home search</p><h1>Sign in to NestMatch</h1>
    {!auth.isConfigured ? <div className="notice"><div><strong>Collaborative Demo Mode</strong><p>Accounts are not configured for this deployment, but the complete couple demo still works.</p></div></div> : <><p className="lede small">Sign in with your password, create an account, or choose another secure method.</p><AuthChoices /></>}
    <p className="demo-link"><Link to="/group/demo">Try the Collaborative Demo</Link></p>
  </section>;
}
