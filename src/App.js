import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout        from './components/Layout';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Members       from './pages/Members';
import Ideas         from './pages/Ideas';
import Projects      from './pages/Projects';
import Events        from './pages/Events';
import Meetings      from './pages/Meetings';
import Mentors       from './pages/Mentors';
import Announcements from './pages/Announcements';
import Leaderboard   from './pages/Leaderboard';
import AdminPanel    from './pages/AdminPanel';
import Profile       from './pages/Profile';

const PAGES = {
  dashboard:     Dashboard,
  members:       Members,
  ideas:         Ideas,
  projects:      Projects,
  events:        Events,
  meetings:      Meetings,
  mentors:       Mentors,
  announcements: Announcements,
  leaderboard:   Leaderboard,
  admin:         AdminPanel,
  profile:       Profile,
};

function App() {
  const { user, loading } = useAuth();
  const [page, setPage]   = useState('dashboard');

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f1117' }}>
        <div style={{ textAlign:'center' }}>
          <i className="ti ti-loader-2" style={{ fontSize:40, color:'#6c63ff', animation:'spin 0.8s linear infinite', display:'block' }} />
          <p style={{ color:'#5f6680', marginTop:12, fontSize:14 }}>Loading LETVC Innovations Club…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return <Login />;

  const PageComponent = PAGES[page] || Dashboard;

  return (
    <Layout page={page} setPage={setPage}>
      <PageComponent setPage={setPage} />
    </Layout>
  );
}

export default function Root() {
  return <AuthProvider><App /></AuthProvider>;
}
