import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, User, BookOpen, CreditCard, UserCheck, 
  ArrowRight, Sparkles, Plus, CalendarCheck, Award, Command
} from 'lucide-react';
import { useFirestore } from '../lib/hooks/useFirestore';
import { Student, Course, Payment, Teacher } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPaymentModal?: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ 
  isOpen, 
  onClose,
  onOpenPaymentModal
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { list: listStudents } = useFirestore<Student>('students');
  const { list: listCourses } = useFirestore<Course>('courses');
  const { list: listTeachers } = useFirestore<Teacher>('teachers');
  const { list: listPayments } = useFirestore<Payment>('payments');

  const [students, setStudents] = useState<(Student & { id: string })[]>([]);
  const [courses, setCourses] = useState<(Course & { id: string })[]>([]);
  const [teachers, setTeachers] = useState<(Teacher & { id: string })[]>([]);
  const [payments, setPayments] = useState<(Payment & { id: string })[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      Promise.all([listStudents(), listCourses(), listTeachers(), listPayments()])
        .then(([s, c, t, p]) => {
          setStudents(Array.isArray(s) ? s : []);
          setCourses(Array.isArray(c) ? c : []);
          setTeachers(Array.isArray(t) ? t : []);
          setPayments(Array.isArray(p) ? p : []);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Handle Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open search modal
          const searchBtn = document.getElementById('global-search-trigger');
          if (searchBtn) searchBtn.click();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { students: [], courses: [], teachers: [], payments: [] };

    const matchingStudents = students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.phoneNumber && s.phoneNumber.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    ).slice(0, 4);

    const matchingCourses = courses.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    ).slice(0, 4);

    const matchingTeachers = teachers.filter(t => 
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
      (t.specialty && t.specialty.toLowerCase().includes(q))
    ).slice(0, 3);

    const matchingPayments = payments.filter(p => 
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    ).slice(0, 3);

    return {
      students: matchingStudents,
      courses: matchingCourses,
      teachers: matchingTeachers,
      payments: matchingPayments
    };
  }, [query, students, courses, teachers, payments]);

  if (!isOpen) return null;

  const totalFound = results.students.length + results.courses.length + results.teachers.length + results.payments.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-16 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E5E5E0] overflow-hidden flex flex-col text-left"
        >
          {/* Input Bar */}
          <div className="p-4 border-b border-[#E5E5E0] flex items-center gap-3 bg-[#F9F9F7]">
            <Search className="text-emerald-700" size={22} />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher un élève, une formation, un règlement, un prof..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent border-none text-base font-medium focus:outline-none placeholder:text-[#8E9299]"
            />
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block px-2 py-1 bg-white border border-[#E5E5E0] rounded-lg text-[10px] font-bold text-[#8E9299]">ESC</span>
              <button 
                onClick={onClose}
                className="p-1.5 text-[#8E9299] hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Action Shortcuts when query is empty */}
          {!query.trim() && (
            <div className="p-6 space-y-4">
              <p className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider">Accès & Actions Rapides</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenPaymentModal) onOpenPaymentModal();
                    else navigate('/payments');
                  }}
                  className="flex items-center gap-3 p-3.5 bg-emerald-50/70 border border-emerald-100 hover:bg-emerald-100/80 rounded-2xl text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                    <Plus size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950 group-hover:text-emerald-800">Saisir un Paiement</p>
                    <p className="text-[10px] text-[#8E9299]">Versement & Reçu élève</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate('/students');
                  }}
                  className="flex items-center gap-3 p-3.5 bg-[#F9F9F7] border border-[#E5E5E0] hover:bg-white rounded-2xl text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Inscrire un Élève</p>
                    <p className="text-[10px] text-[#8E9299]">Liste des étudiants</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate('/attendance');
                  }}
                  className="flex items-center gap-3 p-3.5 bg-[#F9F9F7] border border-[#E5E5E0] hover:bg-white rounded-2xl text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center font-bold">
                    <CalendarCheck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Faire l'Appel du Jour</p>
                    <p className="text-[10px] text-[#8E9299]">Présences & Absences</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate('/grades');
                  }}
                  className="flex items-center gap-3 p-3.5 bg-[#F9F9F7] border border-[#E5E5E0] hover:bg-white rounded-2xl text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center font-bold">
                    <Award size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Saisir Notes & Bulletins</p>
                    <p className="text-[11px] text-[#8E9299]">Évaluations et moyennes</p>
                  </div>
                </button>

              </div>
            </div>
          )}

          {/* Results List */}
          {query.trim() && (
            <div className="p-4 max-h-96 overflow-y-auto space-y-4">
              {totalFound === 0 ? (
                <div className="p-8 text-center text-[#8E9299] italic text-xs">
                  Aucun résultat trouvé pour "{query}".
                </div>
              ) : (
                <>
                  {/* Students */}
                  {results.students.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-2 px-2">Élèves</p>
                      <div className="space-y-1">
                        {results.students.map(s => (
                          <div 
                            key={s.id}
                            onClick={() => {
                              onClose();
                              navigate(`/students?search=${encodeURIComponent(s.firstName)}`);
                            }}
                            className="p-3 bg-[#F9F9F7] hover:bg-emerald-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors border border-[#E5E5E0]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                                {s.firstName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#1A1A1A]">{s.firstName} {s.lastName}</p>
                                <p className="text-[10px] text-[#8E9299]">{s.phoneNumber || s.email || 'Élève inscrit'}</p>
                              </div>
                            </div>
                            <ArrowRight size={14} className="text-[#8E9299]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Courses */}
                  {results.courses.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-2 px-2">Formations</p>
                      <div className="space-y-1">
                        {results.courses.map(c => (
                          <div 
                            key={c.id}
                            onClick={() => {
                              onClose();
                              navigate('/courses');
                            }}
                            className="p-3 bg-[#F9F9F7] hover:bg-emerald-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors border border-[#E5E5E0]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                                <BookOpen size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#1A1A1A]">{c.name}</p>
                                <p className="text-[10px] text-emerald-700 font-bold">{c.price.toLocaleString()} FCFA</p>
                              </div>
                            </div>
                            <ArrowRight size={14} className="text-[#8E9299]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teachers */}
                  {results.teachers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-2 px-2">Enseignants</p>
                      <div className="space-y-1">
                        {results.teachers.map(t => (
                          <div 
                            key={t.id}
                            onClick={() => {
                              onClose();
                              navigate('/teachers');
                            }}
                            className="p-3 bg-[#F9F9F7] hover:bg-emerald-50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors border border-[#E5E5E0]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs">
                                <UserCheck size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#1A1A1A]">{t.firstName} {t.lastName}</p>
                                <p className="text-[10px] text-[#8E9299]">{t.specialty || 'Formateur'}</p>
                              </div>
                            </div>
                            <ArrowRight size={14} className="text-[#8E9299]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer Bar */}
          <div className="p-3 bg-[#F5F5F0] border-t border-[#E5E5E0] flex items-center justify-between text-[11px] text-[#8E9299]">
            <span>Recherche globale universelle</span>
            <span className="font-bold text-emerald-800">kalan gest KG</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
