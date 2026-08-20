import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, ShieldCheck, QrCode, Award, UserCheck } from 'lucide-react';
import { Teacher } from '../types';
import { exportTeacherCardPDF } from '../lib/pdfExport';
import { toast } from 'sonner';

interface TeacherCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: (Teacher & { id: string }) | null;
  centerName?: string;
}

export const TeacherCardModal: React.FC<TeacherCardModalProps> = ({
  isOpen,
  onClose,
  teacher,
  centerName = 'kalan gest KG'
}) => {
  if (!isOpen || !teacher) return null;

  const teacherId = teacher.teacherIdNumber || `ENS-${teacher.id.slice(0, 5).toUpperCase()}`;

  const handleDownloadPDF = () => {
    try {
      exportTeacherCardPDF({
        teacher,
        centerInfo: { name: centerName }
      });
      toast.success(`Carte professionnelle PDF générée pour ${teacher.firstName} ${teacher.lastName}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération de la carte enseignant");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E5E5E0] relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-[#8E9299] hover:text-[#1A1A1A] hover:bg-[#F0F0EE] rounded-full transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2.5 mb-6">
            <UserCheck className="text-amber-600" size={24} />
            <div>
              <h3 className="font-serif font-bold text-xl text-[#1A1A1A]">Carte Professionnelle Enseignant</h3>
              <p className="text-xs text-[#8E9299]">Badge officiel du corps professoral</p>
            </div>
          </div>

          {/* Badge Preview Box (Proportional CR80 badge) */}
          <div className="my-6 p-4 bg-slate-100/70 rounded-2xl border border-slate-200 flex justify-center">
            <div className="w-[340px] h-[215px] bg-white rounded-xl shadow-xl border border-slate-300 overflow-hidden flex flex-col justify-between relative select-none">
              
              {/* Card Header Banner */}
              <div className="bg-slate-950 text-white px-3.5 py-2 flex items-center justify-between border-b-2 border-amber-500">
                <div className="overflow-hidden">
                  <h4 className="font-bold text-[11px] tracking-wide uppercase truncate leading-tight">{centerName}</h4>
                  <p className="text-[8px] text-amber-200 tracking-widest uppercase font-semibold">Carte de Service & Enseignant</p>
                </div>
                <div className="bg-amber-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 shadow-sm">
                  Formateur
                </div>
              </div>

              {/* Card Main Body */}
              <div className="p-3 flex gap-3.5 items-start flex-1 bg-gradient-to-br from-white via-slate-50 to-amber-50/20">
                {/* Photo Column */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="w-[72px] h-[88px] bg-slate-100 border border-slate-300 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
                    {teacher.photoUrl ? (
                      <img src={teacher.photoUrl} alt="Formateur" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 text-slate-600 font-bold text-lg uppercase">
                        {teacher.firstName[0]}{teacher.lastName[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                    {teacherId}
                  </span>
                </div>

                {/* Details Column */}
                <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">Nom & Prénom</span>
                    <p className="text-xs font-bold text-slate-900 truncate uppercase">{teacher.lastName} {teacher.firstName}</p>
                  </div>

                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">Discipline / Spécialité</span>
                    <p className="text-[10px] font-bold text-amber-800 truncate">{teacher.specialty || 'Formateur Général'}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-1 pt-0.5">
                    <div>
                      <span className="text-[7px] uppercase text-slate-400 font-bold block">Téléphone</span>
                      <p className="text-[9px] font-semibold text-slate-800">{teacher.phoneNumber || '-'}</p>
                    </div>
                    {teacher.email && (
                      <div>
                        <span className="text-[7px] uppercase text-slate-400 font-bold block">Email</span>
                        <p className="text-[9px] font-semibold text-slate-800 truncate">{teacher.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Bar */}
              <div className="bg-slate-100 px-3 py-1 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-600 font-bold">
                <span>HABILITATION OFFICIELLE</span>
                <div className="flex items-center gap-1 text-slate-900">
                  <QrCode size={12} className="text-amber-700" />
                  <span className="tracking-tighter">ACCÈS AUTORISÉ</span>
                </div>
              </div>

            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-[#E5E5E0] hover:bg-[#F9F9F7] text-[#8E9299] rounded-2xl text-xs font-bold transition-all"
            >
              Fermer
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <Download size={16} />
              Télécharger PDF
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
