import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  UserPlus,
  BookOpen, 
  CreditCard, 
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  Settings as SettingsIcon,
  DownloadCloud,
  UserCheck,
  CalendarCheck,
  Award,
  FolderKanban,
  Search,
  HelpCircle,
  Wifi,
  WifiOff,
  CloudOff
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';
import { GlobalSearchModal } from './GlobalSearchModal';
import { UserGuideModal } from './UserGuideModal';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [centerName, setCenterName] = React.useState('kalan gest KG');
  const [logoUrl, setLogoUrl] = React.useState('');
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connexion Internet rétablie", {
        description: "Vos données se synchronisent automatiquement avec le serveur cloud.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Mode Hors Ligne Activé", {
        description: "Vous continuez à travailler normalement. Vos modifications sont enregistrées localement.",
        duration: 6000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const general = await apiFetch('/api/settings/general', { showToast: false });
        if (general) {
          setCenterName(general.centerName || 'kalan gest KG');
          setLogoUrl(general.logoUrl || '');
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const menuItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Élèves', path: '/students', icon: Users },
    { name: 'Enseignants', path: '/teachers', icon: UserCheck },
    { name: 'Formations', path: '/courses', icon: BookOpen },
    { name: 'Présences', path: '/attendance', icon: CalendarCheck },
    { name: 'Évaluations', path: '/grades', icon: Award },
    { name: 'Inscriptions', path: '/registrations', icon: UserPlus },
    { name: 'Paiements', path: '/payments', icon: CreditCard },
    { name: 'Paramètres', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-[#E5E5E0] flex-col shadow-sm no-print">
        <div className="p-6">
          <div className="flex flex-col items-center mb-4">
            <div className="w-24 h-24 bg-[#F9F9F7] rounded-[1.5rem] border border-[#E5E5E0] flex items-center justify-center p-3 overflow-hidden mb-3 group shadow-inner">
               <img 
                 src={logoUrl || "/input_file_0.png"} 
                 className="w-full h-full object-contain rounded-lg transition-transform duration-500 group-hover:scale-110" 
                 alt="Logo"
                 referrerPolicy="no-referrer"
                 onError={(e) => {
                   (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2670&auto=format&fit=crop";
                 }}
               />
            </div>
            <h1 className="text-lg font-serif text-center font-bold text-emerald-900 leading-tight">
              {centerName}
            </h1>
            <p className="text-[8px] uppercase tracking-widest text-[#8E9299] mt-1.5 font-bold bg-[#F9F9F7] px-2 py-1 rounded-md border border-[#F0F0EE]">Tableau de Gestion</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                  isActive 
                    ? 'bg-emerald-900 text-white shadow-md shadow-emerald-900/20' 
                    : 'text-[#8E9299] hover:bg-[#F9F9F7] hover:text-[#1A1A1A]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'group-hover:text-emerald-600 transition-colors'} />
                <span className="text-xs font-medium">{item.name}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-[-16px] w-1.5 h-5 bg-emerald-900 rounded-r-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#F0F0EE]">
           {deferredPrompt && (
             <button 
               onClick={handleInstallClick}
               className="w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all duration-300 text-[10px] font-bold uppercase tracking-widest border border-emerald-100"
             >
               <DownloadCloud size={16} />
               Installer l'App
             </button>
           )}
           <div className="flex items-center gap-3 p-3 mb-3 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0]">
            <div className="w-8 h-8 rounded-xl bg-emerald-900 text-white flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold truncate leading-none mb-0.5">{user?.displayName || 'Administrateur'}</p>
              <p className="text-[8px] text-[#8E9299] truncate font-medium">Session Active</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[#FF4444] hover:bg-red-50 transition-all duration-300 text-[10px] font-bold uppercase tracking-widest border border-transparent hover:border-red-100"
          >
            <LogOut size={16} />
            Quitter
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        <div className="p-4 lg:p-6 min-h-full print-only-container">
          <header className="mb-6 flex items-center justify-between sticky top-0 bg-[#F5F5F0]/80 backdrop-blur-md z-10 py-3 -mt-3 border-b border-[#E5E5E0] lg:border-none no-print">
          <div className="flex items-center gap-3">
             <div className="lg:hidden w-8 h-8 rounded-lg bg-emerald-900 flex items-center justify-center p-1 shadow-sm">
                <img src={logoUrl || "/input_file_0.png"} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
             </div>
             <div>
              <h2 className="text-lg lg:text-2xl font-serif tracking-tight font-medium">
                {menuItems.find(i => i.path === location.pathname)?.name || 'Tableau de bord'}
              </h2>
              <p className="hidden lg:block text-[11px] text-[#8E9299] mt-0.5 font-sans">Bienvenue dans votre espace de gestion.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Connection Status Badge */}
            {!isOnline ? (
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold shadow-sm animate-pulse"
                title="Vous êtes en mode hors ligne. Vos modifications sont conservées localement et synchronisées une fois reconnecté."
              >
                <WifiOff size={14} className="text-amber-600" />
                <span className="hidden sm:inline">Hors ligne</span>
              </div>
            ) : (
              <div 
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-[11px] font-medium"
                title="Connecté à la base de données cloud"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>En ligne</span>
              </div>
            )}

            {/* Search Trigger */}
            <button
              id="global-search-trigger"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#E5E5E0] hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-[#1A1A1A] transition-all shadow-sm group"
              title="Recherche globale (Ctrl+K)"
            >
              <Search size={15} className="text-[#8E9299] group-hover:text-emerald-700 transition-colors" />
              <span className="hidden sm:inline-block">Rechercher...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#F5F5F0] border border-[#E5E5E0] rounded text-[9px] font-mono text-[#8E9299]">
                Ctrl K
              </kbd>
            </button>

            {/* Guide & Aide Button */}
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl hover:bg-emerald-100 transition-all text-xs font-bold shadow-sm"
              title="Guide d'utilisation"
            >
              <HelpCircle size={15} />
              <span className="hidden md:inline-block">Guide & Aide</span>
            </button>

            <div className="hidden xl:flex flex-col items-end ml-2">
              <span className="text-xs font-medium text-[#1A1A1A] capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            </div>

            <button onClick={logout} className="lg:hidden p-2 border border-[#E5E5E0] bg-white rounded-lg text-[#FF4444] hover:bg-red-50 transition-all shadow-sm">
                <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Global Modals */}
        <GlobalSearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
        />
        
        <UserGuideModal 
          isOpen={isGuideOpen} 
          onClose={() => setIsGuideOpen(false)} 
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E0] flex items-center gap-1 overflow-x-auto px-2 py-2 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] no-scrollbar no-print">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 min-w-[64px] px-2 py-1 rounded-xl transition-all duration-300 shrink-0 ${
                isActive ? 'text-emerald-900 bg-emerald-50/50' : 'text-[#8E9299]'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-emerald-900 fill-emerald-900/10' : ''} />
              <span className="text-[9px] font-bold uppercase tracking-tight truncate max-w-[60px] text-center">{item.name.split(' ')[0]}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-indicator-mobile"
                  className="absolute top-0 w-6 h-1 bg-emerald-900 rounded-b-full"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
