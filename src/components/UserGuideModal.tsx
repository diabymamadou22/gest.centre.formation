import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, HelpCircle, CreditCard, Send, Users, CalendarCheck, Award, Download, 
  Sparkles, CheckCircle2, ChevronRight, BookOpen, Smartphone, FileText
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'whatsapp' | 'students' | 'attendance' | 'grades' | 'exports'>('payments');

  if (!isOpen) return null;

  const tabs = [
    { id: 'payments', label: 'Paiements & Reçus', icon: CreditCard },
    { id: 'whatsapp', label: 'Relances WhatsApp', icon: Smartphone },
    { id: 'students', label: 'Inscriptions Élèves', icon: Users },
    { id: 'attendance', label: 'Présences & Appel', icon: CalendarCheck },
    { id: 'grades', label: 'Bulletins & Diplômes', icon: Award },
    { id: 'exports', label: 'Rapports PDF & Excel', icon: Download },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#E5E5E0] overflow-hidden flex flex-col text-left"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-300">
                <HelpCircle size={22} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold">Guide Utilisateur & Mode d'Emploi</h2>
                <p className="text-xs text-emerald-200">Comment utiliser l'application simplement pour gérer votre centre</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-64 bg-[#F9F9F7] border-r border-[#E5E5E0] p-4 space-y-1.5 shrink-0 overflow-y-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-emerald-900 text-white shadow-md' 
                        : 'text-[#8E9299] hover:bg-white hover:text-[#1A1A1A]'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-emerald-300' : ''} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content Tab Details */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold font-serif text-lg">
                    <CreditCard size={20} />
                    <span>Enregistrer un Paiement & Imprimer un Reçu</span>
                  </div>
                  <p className="text-xs text-[#8E9299]">Suivez ces étapes pour encaisser le versement d'un élève :</p>
                  
                  <div className="space-y-3">
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">Allez dans le menu "Paiements" ou cliquez sur "Nouveau Paiement"</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Cliquez sur le bouton vert d'action rapide dans le tableau de bord ou la page Paiements.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">Sélectionnez l'élève et la formation</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Le solde restant dû s'affiche automatiquement pour éviter les erreurs de calcul.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">Indiquez le montant et la méthode (Wave, Orange Money, Cash)</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Ajoutez un numéro de référence si versement mobile pour garder une preuve comptable.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">Générez et Imprimez le Reçu</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Un reçu officiel au nom du centre est généré. Vous pouvez l'imprimer ou le sauvegarder en PDF.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'whatsapp' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold font-serif text-lg">
                    <Smartphone size={20} />
                    <span>Relancer les Élèves par WhatsApp</span>
                  </div>
                  <p className="text-xs text-[#8E9299]">Facilitez le recouvrement des retards de paiement :</p>

                  <div className="space-y-3">
                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Envoi Instantané des Reçus de Paiement</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Pour chaque versement, cliquez sur "WhatsApp" dans la liste des paiements ou dans l'aperçu du reçu. Un reçu détaillé (numéro de reçu, élève, formation, montant, mode et solde restant) est transmis directement au parent d'élève.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Rappel Individuel d'Impayés</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Dans l'onglet "Rappels & Impayés" de la page Paiements ou dans la fiche de l'élève, cliquez sur le bouton vert WhatsApp. Un message personnalisé pré-rempli avec le montant restant s'ouvre directement.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Diffusion Groupée pour la Classe</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Utilisez l'option "Copier liste des numéros WhatsApp" pour coller tous les numéros des élèves concernés dans un groupe ou une liste de diffusion WhatsApp.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'students' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold font-serif text-lg">
                    <Users size={20} />
                    <span>Gestion des Inscriptions & Fiches Élèves</span>
                  </div>
                  <p className="text-xs text-[#8E9299]">Gardez votre base d'élèves à jour :</p>

                  <div className="space-y-3">
                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Création de l'élève</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Renseignez le prénom, nom, téléphone et adresse. Un profil élève est créé.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Inscription à une formation</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Associez l'élève à un cours dans le menu "Inscriptions" pour qu'il figure sur les listes de présence et de paie.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold font-serif text-lg">
                    <CalendarCheck size={20} />
                    <span>Appel & Suivi des Présences</span>
                  </div>
                  <p className="text-xs text-[#8E9299]">Faites l'appel en classe rapidement :</p>

                  <div className="space-y-3">
                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Validation Rapide "Tout Présent"</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Sélectionnez la date et le cours, puis cliquez sur "Tout marquer présent" pour gagner du temps. Ajustez ensuite les absents en 1 clic.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Imprimer la Fiche d'Émargement Papier</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Téléchargez la fiche de présence au format PDF pour la donner au professeur avant le début de la séance.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'grades' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold font-serif text-lg">
                    <Award size={20} />
                    <span>Saisie des Notes, Bulletins & Certificats</span>
                  </div>
                  <p className="text-xs text-[#8E9299]">Évaluez les compétences et remettez les diplômes :</p>

                  <div className="space-y-3">
                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Bulletin de Notes Automatique</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">La moyenne générale et la mention sont calculées automatiquement selon les coefficients. Cliquez sur "Bulletin PDF" pour l'imprimer.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Attestation de Fin de Formation</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Générez un certificat élégant avec le nom du centre, le sceau officiel et la formation suivie pour les élèves diplômés.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'exports' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold font-serif text-lg">
                    <Download size={20} />
                    <span>Exportation de Données (PDF & Excel)</span>
                  </div>
                  <p className="text-xs text-[#8E9299]">Transmettez des documents propres à la comptabilité ou la direction :</p>

                  <div className="space-y-3">
                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <FileText size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Fichiers PDF</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Reçus, rapports d'encaissements, listes d'élèves, bulletins et fiches d'émargement sont tous formatés pour une impression A4 directe.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-start gap-3">
                      <FileText size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1A1A]">Fichiers Excel (.CSV)</h4>
                        <p className="text-[11px] text-[#555] mt-0.5">Exportez toutes les listes vers Excel avec un encodage UTF-8 propre qui préserve tous les caractères et montants FCFA.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#F9F9F7] border-t border-[#E5E5E0] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#8E9299] font-medium">Besoin d'aide supplémentaire ? Contactez l'administrateur du centre.</span>
            <button 
              onClick={onClose}
              className="px-5 py-2 bg-emerald-900 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-all shadow-sm"
            >
              J'ai Compris
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
