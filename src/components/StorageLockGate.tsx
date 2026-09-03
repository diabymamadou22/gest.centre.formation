import React, { useState, useEffect, createContext, useContext } from 'react';
import { ShieldAlert, Lock, Unlock, Eye, EyeOff, AlertTriangle, KeyRound, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { settingsApi } from '../lib/api';

interface LockContextType {
  lockApp: () => void;
  isUnlocked: boolean;
}

const LockContext = createContext<LockContextType>({
  lockApp: () => {},
  isUnlocked: false,
});

export const useStorageLock = () => useContext(LockContext);

const STORAGE_KEY = 'kalan_storage_access_unlocked';
const ACCESS_CODE = '00224';

export const StorageLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [centerName, setCenterName] = useState('kalan gest KG');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    // Fetch center name & logo for branding
    const fetchSettings = async () => {
      try {
        const general = await settingsApi.get();
        if (general) {
          if ((general as any).centerName) setCenterName((general as any).centerName);
          if ((general as any).logoUrl) setLogoUrl((general as any).logoUrl);
        }
      } catch (err) {
        console.error('Erreur chargement paramètres:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Veuillez renseigner le mot de passe.');
      return;
    }

    if (password.trim() === ACCESS_CODE) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setIsUnlocked(true);
      setPassword('');
      setError('');
    } else {
      setError('Mot de passe incorrect. Accès refusé.');
    }
  };

  const lockApp = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIsUnlocked(false);
    setPassword('');
    setError('');
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-4 selection:bg-amber-100 selection:text-amber-900">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-900/5 p-6 sm:p-10 border border-[#E5E5E0] text-center relative overflow-hidden"
        >
          {/* Top subtle alert decorative line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

          {/* Logo / Header Branding */}
          <div className="w-20 h-20 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-center justify-center p-3 overflow-hidden mb-5 mx-auto shadow-inner">
            <img 
              src={logoUrl || "/input_file_0.png"} 
              className="w-full h-full object-contain rounded-lg" 
              alt="Logo"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2670&auto=format&fit=crop";
              }}
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1A1A] mb-1">
            {centerName}
          </h1>
          <p className="text-xs text-[#8E9299] font-medium uppercase tracking-wider mb-6">
            Système de Gestion & Suivi
          </p>

          {/* Prompt Requested Alert Description */}
          <div className="mb-6 p-4 bg-amber-50/90 border border-amber-300/80 rounded-2xl text-left shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-900 rounded-xl shrink-0 mt-0.5">
                <AlertTriangle size={20} className="text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1.5">
                  <Database size={13} />
                  Alerte Système
                </h3>
                <p className="text-sm font-semibold text-amber-950 leading-relaxed">
                  Alerte : Le stockage est saturé, veuillez contacter Mr Diaby pour régler le paiement de stockage. Merci.
                </p>
              </div>
            </div>
          </div>

          {/* Password Form */}
          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div>
              <label 
                htmlFor="access-password-input" 
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound size={14} className="text-emerald-700" />
                  Mot de passe d'accès
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  Champ masqué
                </span>
              </label>

              <div className="relative">
                <input
                  id="access-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  placeholder="Entrez le mot de passe..."
                  autoComplete="current-password"
                  className={`w-full px-4 py-3.5 pr-12 rounded-2xl border text-sm font-medium bg-[#FAFAF8] text-slate-900 transition-all outline-none focus:bg-white ${
                    error 
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' 
                      : 'border-[#D8D8D0] focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <p className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                  <ShieldAlert size={14} />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-900 hover:bg-emerald-800 active:scale-[0.98] text-white py-3.5 px-5 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-emerald-950/10 cursor-pointer"
            >
              <Unlock size={16} />
              Déverrouiller l'accès
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-5 border-t border-[#F0F0EE] flex items-center justify-between text-[11px] text-[#8E9299]">
            <span className="flex items-center gap-1">
              <Lock size={12} />
              Accès protégé
            </span>
            <span className="font-medium text-slate-600">
              Contact : Mr Diaby
            </span>
          </div>
        </motion.div>

        <p className="mt-6 text-xs text-[#A0A09A] font-light">
          Centre de formation • kalan gest KG
        </p>
      </div>
    );
  }

  return (
    <LockContext.Provider value={{ lockApp, isUnlocked }}>
      {children}
    </LockContext.Provider>
  );
};
