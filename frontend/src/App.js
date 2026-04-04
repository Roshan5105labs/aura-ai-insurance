import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Sidebar from './components/Sidebar';
import Onboarding from './pages/Onboarding';
import WorkerDashboard from './pages/WorkerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Claims from './pages/Claims';
import PolicyManagement from './pages/PolicyManagement';
import AdminPolicies from './pages/AdminPolicies';
import AdminClaims from './pages/AdminClaims';

export const AppContext = React.createContext(null);

export default function App() {
  const [worker, setWorker] = useState(null);
  const [view, setView]     = useState('worker'); // 'worker' | 'admin'

  const isOnboarded = !!worker;

  return (
    <AppContext.Provider value={{ worker, setWorker, view, setView }}>
      <BrowserRouter>
        <div className="layout">
          {isOnboarded && <Sidebar />}
          <div className={isOnboarded ? 'main-content' : ''} style={!isOnboarded ? { flex: 1 } : {}}>
            <Routes>
              <Route path="/"          element={isOnboarded ? <Navigate to="/dashboard" /> : <Onboarding />} />
              <Route path="/dashboard" element={isOnboarded ? (view === 'admin' ? <AdminDashboard /> : <WorkerDashboard />) : <Navigate to="/" />} />
              <Route path="/policy"    element={isOnboarded ? <PolicyManagement /> : <Navigate to="/" />} />
              <Route path="/claims"    element={isOnboarded ? <Claims />           : <Navigate to="/" />} />
              <Route path="/admin-policies" element={isOnboarded ? <AdminPolicies /> : <Navigate to="/" />} />
              <Route path="/admin-claims"   element={isOnboarded ? <AdminClaims />   : <Navigate to="/" />} />
              <Route path="*"          element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
