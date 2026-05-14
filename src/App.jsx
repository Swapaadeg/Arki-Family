import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import TribePage from './pages/TribePage/TribePage';
import PublicTribePage from './pages/TribePage/PublicTribePage';
import TribesListPage from './pages/TribesListPage';
import TribeCustomization from './pages/TribeCustomization/TribeCustomization';
import UserProfile from './pages/UserProfile';
import EventsList from './pages/Events/EventsList';
import EventDetail from './pages/Events/EventDetail';
import CreateEvent from './pages/Events/CreateEvent';
import EditEvent from './pages/Events/EditEvent';
import AdminDashboard from './pages/Admin/AdminDashboard';
import TribesManagement from './pages/Admin/TribesManagement';
import DinosManagement from './pages/Admin/DinosManagement';
import MentionsLegales from './pages/Legal/MentionsLegales';
import PolitiqueConfidentialite from './pages/Legal/PolitiqueConfidentialite';
import CGU from './pages/Legal/CGU';
import './styles/main.scss';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tribe" element={<TribePage />} />
            <Route path="/tribes" element={<TribesListPage />} />
            <Route path="/tribes/:id" element={<PublicTribePage />} />
            <Route path="/tribe/customize" element={<TribeCustomization />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/events" element={<EventsList />} />
            <Route path="/events/create" element={<CreateEvent />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/events/:id/edit" element={<EditEvent />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/tribes" element={<TribesManagement />} />
            <Route path="/admin/events" element={<EventsList />} />
            <Route path="/admin/dinos" element={<DinosManagement />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
            <Route path="/cgu" element={<CGU />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
