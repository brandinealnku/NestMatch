import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AuthChoices } from "../components/auth/AuthChoices";

export function SignInPage() {
  const auth = useAuth();
  return <section className="panel narrow auth-panel"><p className="eyebrow">Private home search</p><h1>Sign in to NestMatch</h1>
    {!auth.isConfigured ? <div className="notice"><div><strong>Collaborative Demo Mode</strong><p>Accounts are not configured for this deployment, but the complete couple demo still works.</p></div></div> : <><p className="lede small">No password needed. Choose a secure sign-in method.</p><AuthChoices /></>}
    <p className="demo-link"><Link to="/group/demo">Try the Collaborative Demo</Link></p>
  </section>;
}
