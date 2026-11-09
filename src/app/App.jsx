import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppRoutes from './routes.jsx';

export default function App() {
  const { pathname } = useLocation();

  // Keep the effect callback synchronous and ensure it never returns a value.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return <AppRoutes />;
}
