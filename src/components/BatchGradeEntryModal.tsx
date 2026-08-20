import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, CheckCircle2, Award, Zap, Sparkles, Search } from 'lucide-react';
import { Course, Student } from '../types';
import { toast } from 'sonner';
import { SearchableSelect } from './SearchableSelect';

interface BatchGradeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  students: Student[];
  enrollments?: any[];
  existingGrades?: any[];
  onSaveBatch: (gradesToCreate: any[]) => Promise<void>;
}

export const BatchGradeEntryModal: React.FC<BatchGradeEntryModalProps> = ({
  isOpen,
  onClose,
  courses,
  students,
  enrollments = [],
  existingGrades = [],
  onSaveBatch
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [title, setTitle] = useState<string>('Contrôle Continu 1');
  const [maxGrade, setMaxGrade] = useState<number>(20);
  const [coefficient, setCoefficient] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Student grade entries: { [studentId]: { grade: string, comments: string, isAbsent: boolean } }
  const [studentGrades, setStudentGrades] = useState<{
    [studentId: string]: { grade: string; comments: string; isAbsent: boolean };
  }>({});

  const [saving, setSaving] = useState(false);

  // Quick preset titles
  const PRESET_TITLES = [
    'Contrôle Continu 1',
    'Contrôle Continu 2',
    'Examen Trimestriel',
    'Devoir Pratique',
    'Test Oral',
    'Projet de Groupe'
  ];

  const [filterMode, setFilterMode] = useState<'all' | 'enrolled'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Initialize course
  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  // Filter students enrolled in the selected course
  const enrolledStudents = students.filter(s => {
    if (!selectedCourseId) return true;
    if (!enrollments || enrollments.length === 0) return true;
    return enrollments.some(e => e.studentId === s.id && e.courseId === selectedCourseId && e.status !== 'cancelled');
  });

  // Base list depending on filter mode
  const baseStudents = filterMode === 'enrolled' ? enrolledStudents : students;

  // Filter base list by search query
  const targetStudents = baseStudents.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const studentNum = (s.studentIdNumber || '').toLowerCase();
    const phone = (s.phoneNumber || '').toLowerCase();
    return fullName.includes(q) || studentNum.includes(q) || phone.includes(q);
  });

  // Initialize grade entries for all students
  useEffect(() => {
    const initial: { [id: string]: { grade: string; comments: string; isAbsent: boolean } } = { ...studentGrades };
    students.forEach(s => {
      if (!initial[s.id]) {
        initial[s.id] = { grade: '', comments: '', isAbsent: false };
      }
    });
    setStudentGrades(initial);
  }, [students]);

  if (!isOpen) return null;

  const handleGradeChange = (studentId: string, val: string) => {
    setStudentGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        grade: val,
        isAbsent: false
      }
    }));
  };

  const handleCommentChange = (studentId: string, val: string) => {
    setStudentGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        comments: val
      }
    }));
  };

  const handleToggleAbsent = (studentId: string) => {
    setStudentGrades(prev => {
      const current = prev[studentId] || { grade: '', comments: '', isAbsent: false };
      const newAbsent = !current.isAbsent;
      return {
        ...prev,
        [studentId]: {
          ...current,
          grade: newAbsent ? '0' : '',
          comments: newAbsent ? 'Absent(e)' : current.comments,
          isAbsent: newAbsent
        }
      };
    });
  };

  const handleQuick20 = (studentId: string) => {
    setStudentGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        grade: String(maxGrade),
        isAbsent: false
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Veuillez sélectionner un cours');
      return;
    }
    if (!title.trim()) {
      toast.error("Veuillez saisir un intitulé pour l'évaluation");
      return;
    }

    const payloadList: any[] = [];

    targetStudents.forEach(s => {
      const entry = studentGrades[s.id];
      if (entry && entry.grade !== '') {
        const numVal = parseFloat(entry.grade);
        if (!isNaN(numVal)) {
          payloadList.push({
            studentId: s.id,
            courseId: selectedCourseId,
            title: title.trim(),
            grade: numVal,
            maxGrade: maxGrade || 20,
            coefficient: coefficient || 1,
            date: date,
            comments: entry.comments || (entry.isAbsent ? 'Absent(e)' : '')
          });
        }
      }
    });

    if (payloadList.length === 0) {
      toast.error('Veuillez saisir au moins une note pour un élève');
      return;
    }

    setSaving(true);
    try {
      await onSaveBatch(payloadList);
      toast.success(`${payloadList.length} note(s) enregistrée(s) avec succès !`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement par lot");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#1A1A1A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-[#E5E5E0] relative my-auto max-h-[92vh] flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-[#8E9299] hover:text-[#1A1A1A] hover:bg-[#F0F0EE] rounded-full transition-all"
          >
            <X size={20} />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-[#F0F0EE] pb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900 text-amber-400 flex items-center justify-center shadow-md">
              <Zap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-xl text-[#1A1A1A]">Saisie Rapide des Notes par Classe</h3>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Mode Lot Express
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">Remplissez les notes de toute la classe en une seule fois.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-6">
            {/* Top Parameters bar */}
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E5E5E0] space-y-4 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Course selector */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
                    Cours / Matière *
                  </label>
                  <SearchableSelect
                    value={selectedCourseId}
                    onChange={val => setSelectedCourseId(val)}
                    placeholder="Choisir une matière..."
                    required={true}
                    options={courses.map(c => ({ value: c.id, label: c.name }))}
                  />
                </div>

                {/* Evaluation Title */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
                    Intitulé de l'Évaluation *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    placeholder="ex: Devoir Trimestriel 1"
                    className="w-full bg-white border border-[#E5E5E0] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                  />
                </div>

                {/* Note Max & Coefficient */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
                      Bareme Max
                    </label>
                    <input
                      type="number"
                      value={maxGrade}
                      onChange={e => setMaxGrade(parseFloat(e.target.value) || 20)}
                      className="w-full bg-white border border-[#E5E5E0] rounded-xl px-3 py-2 text-xs font-mono font-bold text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
                      Coeff.
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={coefficient}
                      onChange={e => setCoefficient(parseFloat(e.target.value) || 1)}
                      className="w-full bg-white border border-[#E5E5E0] rounded-xl px-3 py-2 text-xs font-mono font-bold text-center focus:outline-none"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
                    Date de l'Évaluation
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E0] rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Title Quick Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[#8E9299] font-medium mr-1">Raccourcis :</span>
                {PRESET_TITLES.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTitle(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all border ${
                      title === preset
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-white text-[#8E9299] border-[#E5E5E0] hover:text-[#1A1A1A] hover:bg-gray-50'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Student Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF9F6] p-3 rounded-2xl border border-[#E5E5E0]">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" size={14} />
                <input
                  type="text"
                  placeholder="Chercher un élève par nom/matricule..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E5E5E0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                    filterMode === 'all'
                      ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
                      : 'bg-white text-[#8E9299] border-[#E5E5E0] hover:text-[#1A1A1A]'
                  }`}
                >
                  Tous les élèves ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('enrolled')}
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                    filterMode === 'enrolled'
                      ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
                      : 'bg-white text-[#8E9299] border-[#E5E5E0] hover:text-[#1A1A1A]'
                  }`}
                >
                  Inscrits au cours ({enrolledStudents.length})
                </button>
              </div>
            </div>

            {/* Students Grades Table */}
            <div className="flex-1 min-h-[280px] overflow-y-auto border border-[#E5E5E0] rounded-2xl bg-white shadow-inner">
              {targetStudents.length === 0 ? (
                <div className="p-12 text-center text-[#8E9299]">
                  <p className="text-xs">Aucun élève trouvé pour ce cours.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F6] sticky top-0 z-10 border-b border-[#E5E5E0] text-[10px] uppercase tracking-wider text-[#8E9299]">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Élève</th>
                      <th className="p-3 w-36 text-center">Saisie Note (/{maxGrade})</th>
                      <th className="p-3 w-28 text-center">Ramene /20</th>
                      <th className="p-3 w-32 text-center">Moyenne Projetée</th>
                      <th className="p-3">Appréciation / Remarque</th>
                      <th className="p-3 w-24 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0EE]">
                    {targetStudents.map((s, index) => {
                      const entry = studentGrades[s.id] || { grade: '', comments: '', isAbsent: false };

                      // Calculate current and projected weighted average
                      const studentPrevGrades = existingGrades.filter(
                        g => g.studentId === s.id && (selectedCourseId ? g.courseId === selectedCourseId : true)
                      );

                      let prevTotalScore = 0;
                      let prevTotalCoeff = 0;
                      studentPrevGrades.forEach(g => {
                        const norm = (g.grade / (g.maxGrade || 20)) * 20;
                        const coeff = g.coefficient || 1;
                        prevTotalScore += norm * coeff;
                        prevTotalCoeff += coeff;
                      });
                      const prevAvg = prevTotalCoeff > 0 ? prevTotalScore / prevTotalCoeff : null;

                      const numVal = parseFloat(entry.grade);
                      const isValidGrade = !isNaN(numVal) && !entry.isAbsent;
                      const gradeOn20 = isValidGrade ? (numVal / (maxGrade || 20)) * 20 : null;

                      let projectedAvg = prevAvg;
                      if (isValidGrade && gradeOn20 !== null) {
                        const newTotalScore = prevTotalScore + (gradeOn20 * (coefficient || 1));
                        const newTotalCoeff = prevTotalCoeff + (coefficient || 1);
                        projectedAvg = newTotalCoeff > 0 ? newTotalScore / newTotalCoeff : gradeOn20;
                      }

                      return (
                        <tr key={s.id} className="hover:bg-amber-50/20 transition-colors">
                          <td className="p-3 text-center font-mono text-[#8E9299]">{index + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-900 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                                {s.photoUrl ? (
                                  <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span>{s.firstName[0]}{s.lastName[0]}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-[#1A1A1A]">{s.firstName} {s.lastName}</p>
                                <p className="text-[10px] text-[#8E9299] font-mono">
                                  {prevAvg !== null ? `Moy. Actuelle: ${prevAvg.toFixed(2)}/20` : 'Aucune note'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Grade input */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max={maxGrade}
                                placeholder="--"
                                disabled={entry.isAbsent}
                                value={entry.grade}
                                onChange={e => handleGradeChange(s.id, e.target.value)}
                                className={`w-20 text-center font-mono font-bold text-sm py-1.5 px-2 rounded-xl border transition-all ${
                                  entry.isAbsent
                                    ? 'bg-red-50 text-red-600 border-red-200 cursor-not-allowed'
                                    : entry.grade !== ''
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-900/10'
                                    : 'bg-[#F9F9F7] text-[#1A1A1A] border-[#E5E5E0] focus:ring-2 focus:ring-emerald-900/20'
                                }`}
                              />
                              <span className="text-[10px] text-[#8E9299] font-mono">/{maxGrade}</span>
                            </div>
                          </td>

                          {/* Grade on 20 (Calculated) */}
                          <td className="p-3 text-center font-mono">
                            {entry.isAbsent ? (
                              <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">
                                ABSENT
                              </span>
                            ) : gradeOn20 !== null ? (
                              <span className={`font-bold px-2 py-0.5 rounded-lg ${
                                gradeOn20 >= 14
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : gradeOn20 >= 10
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-red-100 text-red-900'
                              }`}>
                                {gradeOn20.toFixed(2)} / 20
                              </span>
                            ) : (
                              <span className="text-[#8E9299] text-[10px]">--</span>
                            )}
                          </td>

                          {/* Projected Average */}
                          <td className="p-3 text-center font-mono">
                            {projectedAvg !== null ? (
                              <div className="flex flex-col items-center">
                                <span className="font-extrabold text-slate-900 text-xs">
                                  {projectedAvg.toFixed(2)} / 20
                                </span>
                                {prevAvg !== null && isValidGrade && (
                                  <span className={`text-[9px] font-bold ${
                                    projectedAvg >= prevAvg ? 'text-emerald-700' : 'text-red-600'
                                  }`}>
                                    {projectedAvg >= prevAvg ? `+${(projectedAvg - prevAvg).toFixed(2)}` : `${(projectedAvg - prevAvg).toFixed(2)}`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#8E9299] text-[10px]">--</span>
                            )}
                          </td>

                          {/* Comment input + preset chips */}
                          <td className="p-3 space-y-1">
                            <input
                              type="text"
                              placeholder="Remarque (ex: Très bien, Effort soutenu...)"
                              value={entry.comments}
                              onChange={e => handleCommentChange(s.id, e.target.value)}
                              className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                            />
                            {/* Quick comment chips */}
                            <div className="flex items-center gap-1 overflow-x-auto">
                              {['Très Bien', 'Bien', 'Effort soutenu', 'Avertissement'].map(chip => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => handleCommentChange(s.id, chip)}
                                  className="text-[9px] bg-[#F0F0EE] hover:bg-emerald-100 hover:text-emerald-900 text-[#8E9299] px-1.5 py-0.5 rounded transition-all whitespace-nowrap"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          </td>

                          {/* Quick buttons */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuick20(s.id)}
                                className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-lg transition-all"
                                title="Mettre la note maximale"
                              >
                                Max
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleAbsent(s.id)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                  entry.isAbsent
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 hover:bg-red-200 text-red-800'
                                }`}
                                title="Marquer comme absent(e)"
                              >
                                ABS
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#F0F0EE] shrink-0">
              <div className="text-xs text-[#8E9299] font-medium">
                Saisie pour <span className="font-bold text-[#1A1A1A]">{targetStudents.length} élèves</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-[#8E9299] hover:text-[#1A1A1A] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-900 hover:bg-emerald-800 text-white px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>Enregistrement...</>
                  ) : (
                    <>
                      <Save size={16} />
                      Enregistrer le lot de notes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
