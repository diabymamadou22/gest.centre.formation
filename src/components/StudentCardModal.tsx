import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Printer, X, ShieldCheck, Phone, GraduationCap, Calendar, User, QrCode } from 'lucide-react';
import { Student, Course } from '../types';
import { exportStudentCardPDF } from '../lib/pdfExport';
import { toast } from 'sonner';

interface StudentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: (Student & { id: string }) | null;
  courses: Course[];
  registrations: any[];
  centerName?: string;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  isOpen,
  onClose,
  student,
  courses,
  registrations,
  centerName = 'kalan gest KG'
}) => {
  if (!isOpen || !student) return null;

  const studentRegs = registrations.filter(r => r.studentId === student.id);
  const enrolledCourses = studentRegs
    .map(r => courses.find(c => c.id === r.courseId)?.name)
    .filter(Boolean);
  const courseNames = enrolledCourses.join(', ') || 'Formation Générale';

  const matricule = student.studentIdNumber || `KG-${student.id.slice(0, 5).toUpperCase()}`;

  const handleDownloadPDF = () => {
    try {
      exportStudentCardPDF({
        student,
        courseNames,
        centerInfo: { name: centerName }
      });
      toast.success(`Carte scolaire PDF générée pour ${student.firstName} ${student.lastName}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération de la carte scolaire");
    }
  };

  const handlePrint = () => {
    handleDownloadPDF();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="text-emerald-800" size={24} />
            <div>
              <h3 className="font-serif font-bold text-xl text-[#1A1A1A]">Carte Scolaire d'Élève</h3>
              <p className="text-xs text-[#8E9299]">Badge officiel de l'établissement</p>
            </div>
          </div>

          {/* Badge Preview Box (Proportional to CR80 standard 85.6mm x 54mm = ~1.58 ratio) */}
          <div className="my-6 p-4 bg-[#F5F5F0] rounded-2xl border border-[#E5E5E0] flex justify-center">
            <div className="w-[340px] h-[215px] bg-white rounded-xl shadow-lg border border-[#D5D5D0] overflow-hidden flex flex-col justify-between relative select-none">
              
              {/* Card Header Banner */}
              <div className="bg-emerald-950 text-white px-3.5 py-2 flex items-center justify-between border-b-2 border-amber-500 relative">
                <div className="overflow-hidden">
                  <h4 className="font-bold text-[11px] tracking-wide uppercase truncate leading-tight">{centerName}</h4>
                  <p className="text-[8px] text-emerald-200 tracking-widest uppercase font-semibold">Carte Scolaire d'Élève</p>
                </div>
                <div className="bg-amber-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 shadow-sm">
                  2025-2026
                </div>
              </div>

              {/* Card Main Body */}
              <div className="p-3 flex gap-3.5 items-start flex-1 bg-gradient-to-br from-white via-emerald-50/10 to-amber-50/20">
                {/* Photo Column */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="w-[72px] h-[88px] bg-slate-100 border border-emerald-800/30 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt="Élève" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-100 text-emerald-900 font-bold text-lg uppercase">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-mono font-bold text-emerald-950 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                    {matricule}
                  </span>
                </div>

                {/* Details Column */}
                <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">Nom & Prénom</span>
                    <p className="text-xs font-bold text-slate-900 truncate uppercase">{student.lastName} {student.firstName}</p>
                  </div>

                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">Inscrit(e) en</span>
                    <p className="text-[10px] font-bold text-emerald-900 truncate">{courseNames}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1 pt-0.5">
                    <div>
                      <span className="text-[7px] uppercase text-slate-400 font-bold block">Téléphone</span>
                      <p className="text-[9px] font-semibold text-slate-800">{student.phoneNumber || '-'}</p>
                    </div>
                    {student.emergencyContact && (
                      <div>
                        <span className="text-[7px] uppercase text-slate-400 font-bold block">Parent/Urg.</span>
                        <p className="text-[9px] font-semibold text-slate-800 truncate">{student.emergencyContact}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Bar */}
              <div className="bg-slate-100 px-3 py-1 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-600 font-bold">
                <span>EST. {new Date().getFullYear()} • HOMOLOGUÉ</span>
                <div className="flex items-center gap-1.5 text-slate-900">
                  <QrCode size={12} className="text-emerald-900" />
                  <span className="tracking-tighter uppercase">STRICTEMENT PERSONNEL</span>
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
              className="flex-1 py-3 px-4 bg-emerald-900 hover:bg-emerald-950 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
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
