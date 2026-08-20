import React from 'react';
import { useAuth } from '../lib/auth';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { settingsApi } from '../lib/api';

export const Login: React.FC = () => {
  const { user, login, loading } = useAuth();
  const [centerName, setCenterName] = React.useState('kalan gest KG');
  const [logoUrl, setLogoUrl] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    // We try to fetch settings, if they are protected it's fine
    const fetchSettings = async () => {
      try {
        const general = await settingsApi.get();
        if (general) {
          setCenterName((general as any).centerName || 'kalan gest KG');
          setLogoUrl((general as any).logoUrl || '');
        }
      } catch (error) {
        console.error("Error fetching settings (might be protected):", error);
      }
    };
    fetchSettings();
  }, []);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    const success = await login();
    setIsSubmitting(false);
  };

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-xl shadow-emerald-900/5 p-12 border border-[#E5E5E0] text-center"
      >
         <div className="w-32 h-32 bg-[#F9F9F7] rounded-[2rem] border border-[#E5E5E0] flex items-center justify-center p-4 overflow-hidden mb-8 mx-auto shadow-inner">
               <img 
                 src={logoUrl || "/input_file_0.png"} 
                 className="w-full h-full object-contain rounded-xl" 
                 alt="Logo"
                 referrerPolicy="no-referrer"
                 onError={(e) => {
                   (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2670&auto=format&fit=crop";
                 }}
               />
        </div>
        
        <h1 className="text-3xl font-serif font-medium text-[#1A1A1A] mb-2">{centerName}</h1>
        <p className="text-[#8E9299] text-sm mb-12">Accès Sécurisé au Système de Gestion</p>

        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-medium hover:bg-emerald-900 transition-all duration-300 flex items-center justify-center gap-3 shadow-md active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
                Se connecter avec Google
              </>
            )}
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-[#F0F0EE]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#C0C0BA] font-bold">Base de Données Permanente Cloud</p>
        </div>
      </motion.div>

      <p className="mt-8 text-sm text-[#C0C0BA] font-light italic">
        "Nourrissez votre savoir dans un environnement structuré"
      </p>
    </div>
  );
};
