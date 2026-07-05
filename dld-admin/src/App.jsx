import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Users from './pages/Users';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './pages/Navbar';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import UserProfile from './pages/UserProfile';
import ShopProjects from './pages/ShopProjects';
import Messages from './pages/Messages';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import AuthSuccess from './pages/AuthSuccess';
import ResetPassword from './pages/ResetPassword';

const ShopLayout = ({ children }) => (
  <div className="min-h-screen bg-white font-sans text-slate-950">
    <Navbar />
    <main>{children}</main>
    <Footer />
    <ChatWidget />
  </div>
);

const AdminRoute = ({ children }) => {
  const { isLoggedIn, isAdmin } = useAuth();
  if (!isLoggedIn) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <DataProvider>
            <Routes>
              <Route path="/" element={<ShopLayout><Home /></ShopLayout>} />
              <Route path="/projects" element={<ShopLayout><ShopProjects /></ShopLayout>} />
              <Route path="/accessories" element={<ShopLayout><ShopProjects itemType="accessory" /></ShopLayout>} />
              <Route path="/product/:id" element={<ShopLayout><ProductDetail /></ShopLayout>} />
              <Route path="/cart" element={<Navigate to="/projects" replace />} />
              <Route path="/contact" element={<Navigate to="/" replace />} />
              <Route path="/profile" element={<ShopLayout><UserProfile /></ShopLayout>} />
              <Route path="/auth" element={<Login />} />
              <Route path="/auth/failure" element={<Login />} />
              <Route path="/auth/success" element={<AuthSuccess />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/login" element={<Navigate to="/auth" replace />} />

              <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="users" element={<Users />} />
                <Route path="orders" element={<Orders />} />
                <Route path="messages" element={<Messages />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DataProvider>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
