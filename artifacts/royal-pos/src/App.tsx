import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initializeStorage, StorageAPI } from "@/lib/storage";
import { useHashLocation } from "@/lib/use-hash-location";

import { AppLayout } from "@/components/layout";
import POS from "@/pages/pos";
import Admin from "@/pages/admin";
import Analytics from "@/pages/analytics";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

const queryClient = new QueryClient();

function Router({ role }: { role: 'admin' | 'staff' | 'manager' }) {
  const [location, setLocation] = useLocation();

  // Role-based access control
  useEffect(() => {
    if (role === 'staff' && (location === '/admin' || location === '/analytics')) {
      setLocation('/');
    }
    if (role === 'manager' && (location === '/' || location === '/admin')) {
      setLocation('/analytics');
    }
  }, [location, role, setLocation]);

  return (
    <AppLayout role={role}>
      <Switch>
        {role !== 'manager' && <Route path="/" component={POS} />}
        {(role === 'admin' || role === 'manager') && (
          <Route path="/analytics" component={Analytics} />
        )}
        {role === 'admin' && (
          <Route path="/admin" component={Admin} />
        )}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  const [auth, setAuth] = useState<{ role: 'admin' | 'staff' | 'manager' } | null>(null);


  useEffect(() => {
    initializeStorage();

    


    // Check if session exists
    const saved = sessionStorage.getItem('royal_session');
    if (saved) setAuth(JSON.parse(saved));
  }, []);



  const handleLogin = (role: 'admin' | 'staff' | 'manager') => {
    const session = { role };
    setAuth(session);
    sessionStorage.setItem('royal_session', JSON.stringify(session));
  };

  const handleLogout = () => {
    setAuth(null);
    sessionStorage.removeItem('royal_session');
  };



  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter hook={useHashLocation}>
          <Router role={auth.role} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

