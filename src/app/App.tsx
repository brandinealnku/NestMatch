import { HashRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "./AppContext";
import { CollaborationProvider } from "../collaboration/CollaborationContext";
import { AuthProvider } from "../auth/AuthProvider";
import { AuthCallbackHandler } from "../auth/AuthCallbackHandler";
import { AuthGate } from "../auth/AuthGate";
import { Layout } from "../components/Layout";
import { LandingPage } from "../pages/LandingPage";
import { PreferencesPage } from "../pages/PreferencesPage";
import { DiscoverPage } from "../pages/DiscoverPage";
import { ListingDetailsPage } from "../pages/ListingDetailsPage";
import { ShortlistPage } from "../pages/ShortlistPage";
import { AboutPage } from "../pages/AboutPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { GroupDemoPage } from "../pages/GroupDemoPage";
import { CollaborativeDiscoverPage } from "../pages/CollaborativeDiscoverPage";
import { DemoMatchesPage } from "../pages/DemoMatchesPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { SignInPage } from "../pages/SignInPage";
import { ProfilePage } from "../pages/ProfilePage";
import { InvitePage } from "../pages/InvitePage";
import { ConnectedGroupsPage } from "../pages/ConnectedGroupsPage";
import { NewGroupPage } from "../pages/NewGroupPage";
import { SettingsPage } from "../pages/SettingsPage";
import { GroupSearchPage } from "../pages/GroupSearchPage";
import { ConnectedDiscoverPage } from "../pages/ConnectedDiscoverPage";
import { ConnectedListingDetailsPage } from "../pages/ConnectedListingDetailsPage";

export function App() { return <AuthProvider><AuthCallbackHandler><AppProvider><CollaborationProvider><HashRouter><Routes><Route element={<Layout />}>
  <Route index element={<LandingPage />} /><Route path="preferences" element={<PreferencesPage />} /><Route path="discover" element={<DiscoverPage />} /><Route path="listing/:id" element={<ListingDetailsPage />} /><Route path="shortlist" element={<ShortlistPage />} />
  <Route path="groups" element={<AuthGate><ConnectedGroupsPage /></AuthGate>} /><Route path="groups/new" element={<AuthGate><NewGroupPage /></AuthGate>} />
  <Route path="groups/:groupId/search" element={<AuthGate><GroupSearchPage /></AuthGate>} /><Route path="groups/:groupId/discover" element={<AuthGate><ConnectedDiscoverPage /></AuthGate>} /><Route path="groups/:groupId/listings/:listingId" element={<AuthGate><ConnectedListingDetailsPage /></AuthGate>} />
  <Route path="group/:groupId" element={<GroupDemoPage />} /><Route path="group/:groupId/discover" element={<CollaborativeDiscoverPage />} /><Route path="group/:groupId/listing/:id" element={<ListingDetailsPage />} /><Route path="group/:groupId/matches" element={<DemoMatchesPage />} />
  <Route path="notifications" element={<NotificationsPage />} /><Route path="sign-in" element={<SignInPage />} /><Route path="profile" element={<AuthGate><ProfilePage /></AuthGate>} /><Route path="invite/:token" element={<InvitePage />} /><Route path="settings" element={<AuthGate><SettingsPage /></AuthGate>} /><Route path="about" element={<AboutPage />} /><Route path="*" element={<NotFoundPage />} />
</Route></Routes></HashRouter></CollaborationProvider></AppProvider></AuthCallbackHandler></AuthProvider>; }
