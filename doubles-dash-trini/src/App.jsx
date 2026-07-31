import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import NoConnectionScreen from '@/components/NoConnectionScreen';
// Add page imports here
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Landing from './pages/Landing';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import SupportPage from './pages/SupportPage';
import DeleteAccountPage from './pages/DeleteAccountPage';
import Play from './pages/Play';
import Upgrades from './pages/Upgrades';
import Leaderboard from './pages/Leaderboard';
import StorePage from './pages/StorePage';
import OrderComplete from './pages/OrderComplete';
import MyBusiness from './pages/MyBusiness';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, networkError, navigateToLogin, checkAppState } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <SplashScreen />;
  }

  // Transient transport failure (e.g. right after an Apple/Google OAuth
  // redirect): offer a retry instead of silently bouncing back to /login.
  if (networkError) {
    return <NoConnectionScreen onRetry={() => checkAppState()} />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Auth pages — public, no sign-in required */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public site pages — no sign-in required. Inside the iOS wrapper the
          marketing landing is skipped: the reviewer/player lands in the game
          (or login) immediately — a website-style first screen is the classic
          App Review 4.2 "web wrapper" trigger. Web visitors still get Landing. */}
      <Route path="/" element={window.NativeIAP?.available ? <Navigate to="/home" replace /> : <Landing />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/delete-account" element={<DeleteAccountPage />} />
      {/* Authenticated game — login required */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/upgrades" element={<Upgrades />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/business" element={<MyBusiness />} />
          <Route path="/order-complete" element={<OrderComplete />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App