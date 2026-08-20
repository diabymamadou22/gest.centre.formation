import React, { useEffect, useState } from 'react';
import { Settings as AppSettings } from '../types';
import { Settings as SettingsIcon, Save, Shield, Mail, Phone, MapPin, Globe, Loader2, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch, settingsApi } from '../lib/api';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    centerName: 'kalan gest KG',
    address: '',
    phoneNumber: '',
    email: '',
    logoUrl: '',
    accessCode: '00223'
  });
  const [admins, setAdmins] = useState<{ id: string; email?: string }[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsData, adminsData] = await Promise.all([
          apiFetch('/api/settings/general', { showToast: false }),
          apiFetch('/api/admins', { showToast: false })
        ]);
        
        if (settingsData) {
          setSettings(settingsData);
        }

        setAdmins(adminsData);
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(settings);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    try {
      // In a real app, you'd need the UID. For this demo, we'll use email as ID or a dummy ID.
      // Since rules use request.auth.uid, we usually save by UID.
      // For simplicity here, we'll alert that they need to be invited.
      alert("La gestion avancée des administrateurs nécessite l'ID utilisateur Firebase.");
    } catch (error) {
      console.error("Error adding admin:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <section className="bg-white rounded-[2rem] border border-[#E5E5E0] shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-[#F0F0EE] bg-[#F9F9F7]">
          <h3 className="font-serif text-2xl font-medium flex items-center gap-3">
            <SettingsIcon size={24} className="text-emerald-700" />
            Informations du Centre
          </h3>
          <p className="text-sm text-[#8E9299] mt-1">Personnalisez l'identité de votre établissement.</p>
        </div>

        <form onSubmit={handleSaveSettings} className="p-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Nom du Centre</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C0C0BA]" size={16} />
                  <input
                    required
                    value={settings.centerName}
                    onChange={(e) => setSettings({ ...settings, centerName: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Logo du Centre</label>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C0C0BA]" size={16} />
                    <input
                      placeholder="URL du logo (ex: https://...)"
                      value={settings.logoUrl || ''}
                      onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setSettings({ ...settings, logoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="logo-upload"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#E5E5E0] rounded-xl text-xs font-bold text-[#1A1A1A] hover:bg-[#F9F9F7] cursor-pointer transition-all shadow-sm active:scale-95"
                    >
                      <Plus size={14} />
                      Téléverser une image
                    </label>
                    {settings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, logoUrl: '' })}
                        className="p-3 text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Prévisualisation du Logo</label>
              <div className="h-[120px] bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl flex items-center justify-center p-4 overflow-hidden relative group">
                {settings.logoUrl ? (
                  <>
                    <img 
                      src={settings.logoUrl} 
                      alt="Logo Preview" 
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2670&auto=format&fit=crop";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logoUrl: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                      title="Supprimer le logo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <ImageIcon size={32} className="mx-auto text-[#C0C0BA] mb-2" />
                    <p className="text-[10px] text-[#C0C0BA] font-medium">Aucun logo configuré</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Email de contact</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C0C0BA]" size={16} />
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C0C0BA]" size={16} />
                <input
                  type="tel"
                  value={settings.phoneNumber || ''}
                  onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Adresse</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C0C0BA]" size={16} />
                <input
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-900 text-white rounded-xl text-sm font-semibold hover:bg-emerald-950 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-[2rem] border border-[#E5E5E0] shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-[#F0F0EE]">
          <h3 className="font-serif text-2xl font-medium flex items-center gap-3">
            <Shield size={24} className="text-amber-600" />
            Sécurité & Administrateurs
          </h3>
          <p className="text-sm text-[#8E9299] mt-1">Gérez les accès privilégiés au système.</p>
        </div>

        <div className="p-10">
          <div className="space-y-6 mb-12">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">Contrôle d'accès</h4>
            <div className="max-w-md space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Code Secret (Pin)</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C0C0BA]" size={16} />
                  <input
                    type="text"
                    maxLength={10}
                    value={settings.accessCode || '00223'}
                    onChange={(e) => setSettings({ ...settings, accessCode: e.target.value })}
                    placeholder="00223"
                    className="w-full pl-12 pr-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono tracking-widest"
                  />
                </div>
                <p className="text-[10px] text-[#A0A09A] mt-1 ml-2 italic">Ce code sera demandé à chaque connexion au système.</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Mettre à jour le code
              </button>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">Administrateurs actuels</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F9F9F7] rounded-xl border border-[#E5E5E0] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">M</div>
                  <span className="text-sm font-medium">diabymamadou3344@gmail.com</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Propriétaire</span>
              </div>
              {admins.filter(a => a.id !== 'bootstrap').map(admin => (
                <div key={admin.id} className="p-4 bg-white rounded-xl border border-[#E5E5E0] flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">A</div>
                    <span className="text-sm font-medium text-slate-700">{admin.email || admin.id}</span>
                  </div>
                  <button className="p-2 text-red-100 hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
