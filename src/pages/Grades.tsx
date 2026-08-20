import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  GraduationCap, 
  Printer, 
  FileSpreadsheet,
  Download,
  Zap,
  Sparkles,
  Save,
  CheckCircle2,
  Calendar,
  MessageSquare,
  BadgeAlert,
  UserCheck
} from 'lucide-react';
import { gradesApi, coursesApi, studentsApi, enrollmentsApi, bulletinAppreciationsApi } from '../lib/api';
import { Grade, Course, Student } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { exportStudentGradeReportPDF } from '../lib/pdfExport';
import { exportToCSV } from '../lib/excelExport';
import { BatchGradeEntryModal } from '../components/BatchGradeEntryModal';
import { SearchableSelect } from '../components/SearchableSelect';

export const Grades: React.FC = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [bulletinAppreciations, setBulletinAppreciations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'grades' | 'bulletins'>('grades');
  const [selectedStudentForBulletin, setSelectedStudentForBulletin] = useState<string>('');
  const [bulletinPeriod, setBulletinPeriod] = useState<string>('1er Trimestre');
  const [bulletinSearch, setBulletinSearch] = useState<string>('');
  
  const [filterStudentId, setFilterStudentId] = useState<string>('all');
  const [filterCourseId, setFilterCourseId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Single Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [studentSearchInModal, setStudentSearchInModal] = useState('');
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    title: '',
    grade: '',
    maxGrade: '20',
    coefficient: '1',
    date: new Date().toISOString().split('T')[0],
    comments: ''
  });

  // Batch Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Bulletin Appreciation State
  const [appreciationText, setAppreciationText] = useState<string>('');
  const [councilDecision, setCouncilDecision] = useState<string>('');
  const [savingAppreciation, setSavingAppreciation] = useState(false);

  const PRESET_TITLES = [
    'Contrôle Continu 1',
    'Contrôle Continu 2',
    'Examen Trimestriel',
    'Devoir Pratique',
    'Test Oral'
  ];

  const DECISION_OPTIONS = [
    'Félicitations du Conseil de Classe',
    'Encouragements du Conseil',
    'Tableau d\'Honneur',
    'Admis / Passage en Classe Supérieure',
    'Avertissement Travail',
    'À encourager'
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [grData, stData, crData, enData, appData] = await Promise.all([
        gradesApi.list(),
        studentsApi.list(),
        coursesApi.list(),
        enrollmentsApi.list(),
        bulletinAppreciationsApi.list()
      ]);

      const sortedStudents = (stData || []).sort((a: Student, b: Student) => 
        (a.lastName || '').localeCompare(b.lastName || '')
      );

      setGrades(grData || []);
      setStudents(sortedStudents);
      setCourses(crData || []);
      setEnrollments(enData || []);
      setBulletinAppreciations(appData || []);

      if (sortedStudents.length > 0 && !selectedStudentForBulletin) {
        setSelectedStudentForBulletin(sortedStudents[0].id);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update local appreciation fields when selected student or period changes
  useEffect(() => {
    if (selectedStudentForBulletin) {
      const docId = `${selectedStudentForBulletin}_${bulletinPeriod.toLowerCase().replace(/[^a-z0-9]/gi, '_')}`;
      const found = bulletinAppreciations.find(a => a.id === docId || (a.studentId === selectedStudentForBulletin && a.period === bulletinPeriod));
      if (found) {
        setAppreciationText(found.appreciation || '');
        setCouncilDecision(found.decision || '');
      } else {
        setAppreciationText('');
        setCouncilDecision('');
      }
    }
  }, [selectedStudentForBulletin, bulletinPeriod, bulletinAppreciations]);

  const handleOpenModal = (gradeToEdit?: Grade) => {
    setStudentSearchInModal('');
    if (gradeToEdit) {
      setEditingGrade(gradeToEdit);
      setFormData({
        studentId: gradeToEdit.studentId,
        courseId: gradeToEdit.courseId,
        title: gradeToEdit.title,
        grade: String(gradeToEdit.grade),
        maxGrade: String(gradeToEdit.maxGrade || 20),
        coefficient: String(gradeToEdit.coefficient || 1),
        date: gradeToEdit.date || new Date().toISOString().split('T')[0],
        comments: gradeToEdit.comments || ''
      });
    } else {
      setEditingGrade(null);
      const defaultStudent = (filterStudentId !== 'all' ? filterStudentId : selectedStudentForBulletin) || students[0]?.id || '';
      const defaultCourse = (filterCourseId !== 'all' ? filterCourseId : courses[0]?.id) || '';
      setFormData({
        studentId: defaultStudent,
        courseId: defaultCourse,
        title: 'Contrôle Continu 1',
        grade: '',
        maxGrade: '20',
        coefficient: '1',
        date: new Date().toISOString().split('T')[0],
        comments: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.courseId || !formData.title || !formData.grade) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const payload = {
      studentId: formData.studentId,
      courseId: formData.courseId,
      title: formData.title,
      grade: parseFloat(formData.grade),
      maxGrade: parseFloat(formData.maxGrade) || 20,
      coefficient: parseFloat(formData.coefficient) || 1,
      date: formData.date,
      comments: formData.comments
    };

    try {
      if (editingGrade) {
        await gradesApi.update(editingGrade.id, payload);
      } else {
        await gradesApi.create(payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving grade:', error);
    }
  };

  const handleSaveBatch = async (gradesList: any[]) => {
    await gradesApi.createBatch(gradesList);
    fetchData();
  };

  const handleSaveAppreciation = async () => {
    if (!selectedStudentForBulletin) return;
    setSavingAppreciation(true);
    try {
      await bulletinAppreciationsApi.save(selectedStudentForBulletin, bulletinPeriod, {
        appreciation: appreciationText,
        decision: councilDecision
      });
      // Refresh appreciations list locally
      const updated = await bulletinAppreciationsApi.list();
      setBulletinAppreciations(updated || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAppreciation(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette note ?')) return;
    try {
      await gradesApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Delete grade error:', error);
    }
  };

  // Filtered grades list for single table
  const filteredGrades = grades.filter(g => {
    const student = students.find(s => s.id === g.studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}`.toLowerCase() : '';
    const matchesCourse = filterCourseId === 'all' || g.courseId === filterCourseId;
    const matchesStudent = filterStudentId === 'all' || g.studentId === filterStudentId;
    const matchesSearch = studentName.includes(searchTerm.toLowerCase()) || g.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCourse && matchesStudent && matchesSearch;
  });

  // Calculate student bulletin data
  const targetStudent = students.find(s => s.id === selectedStudentForBulletin);
  const studentGrades = grades.filter(g => g.studentId === selectedStudentForBulletin);

  const calculateStudentAverage = () => {
    if (studentGrades.length === 0) return '0.00';
    let totalWeightedScore = 0;
    let totalCoeff = 0;

    studentGrades.forEach(g => {
      const scoreOutOf20 = (g.grade / (g.maxGrade || 20)) * 20;
      const coeff = g.coefficient || 1;
      totalWeightedScore += scoreOutOf20 * coeff;
      totalCoeff += coeff;
    });

    return totalCoeff > 0 ? (totalWeightedScore / totalCoeff).toFixed(2) : '0.00';
  };

  const currentAverageNum = parseFloat(calculateStudentAverage());

  const getMentionBadge = (avg: number) => {
    if (avg >= 16) {
      return { text: 'Excellence (Félicitations)', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    }
    if (avg >= 14) {
      return { text: 'Bien (Encouragements)', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    if (avg >= 12) {
      return { text: 'Assez Bien (Tableau d\'Honneur)', bg: 'bg-amber-50 text-amber-900 border-amber-200' };
    }
    if (avg >= 10) {
      return { text: 'Passable (Admis)', bg: 'bg-blue-50 text-blue-900 border-blue-200' };
    }
    return { text: 'Ajourné / Avertissement', bg: 'bg-red-50 text-red-700 border-red-200' };
  };

  const handleExportCSV = () => {
    try {
      const headers = ['#', 'Date', 'Élève', 'Cours', 'Évaluation', 'Note', 'Note Max', 'Coeff.', 'Commentaires'];
      const rows = filteredGrades.map((g, index) => {
        const student = students.find(s => s.id === g.studentId);
        const course = courses.find(c => c.id === g.courseId);
        return [
          index + 1,
          g.date || '',
          student ? `${student.firstName} ${student.lastName}` : 'Inconnu',
          course?.name || 'Inconnu',
          g.title,
          g.grade,
          g.maxGrade || 20,
          g.coefficient || 1,
          g.comments || ''
        ];
      });

      exportToCSV(`releve_notes_${new Date().toISOString().split('T')[0]}`, headers, rows);
      toast.success('Notes exportées en Excel / CSV avec succès');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const handleExportBulletinPDF = () => {
    if (!targetStudent) {
      toast.error("Veuillez sélectionner un élève");
      return;
    }

    try {
      const selectedCourse = courses.find(c => c.id === filterCourseId);
      exportStudentGradeReportPDF({
        student: targetStudent,
        course: selectedCourse,
        grades: studentGrades,
        period: bulletinPeriod,
        generalAppreciation: appreciationText,
        decision: councilDecision
      });
      toast.success(`Bulletin PDF officiel généré pour ${targetStudent.firstName} ${targetStudent.lastName}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du bulletin PDF");
    }
  };

  // Filter student list in bulletin sidebar
  const filteredStudentsForBulletin = students.filter(s => {
    const full = `${s.firstName} ${s.lastName} ${s.studentIdNumber || ''}`.toLowerCase();
    return full.includes(bulletinSearch.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#E5E5E0] shadow-sm no-print">
        <div className="flex items-center gap-2 bg-[#F9F9F7] p-1.5 rounded-2xl border border-[#E5E5E0]">
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'grades'
                ? 'bg-emerald-900 text-white shadow-md'
                : 'text-[#8E9299] hover:text-[#1A1A1A]'
            }`}
          >
            <Award size={16} />
            Gestion des Notes ({grades.length})
          </button>
          <button
            onClick={() => setActiveTab('bulletins')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bulletins'
                ? 'bg-emerald-900 text-white shadow-md'
                : 'text-[#8E9299] hover:text-[#1A1A1A]'
            }`}
          >
            <GraduationCap size={16} />
            Bulletins de Notes & Appréciations
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'grades' && (
            <>
              <button
                onClick={handleExportCSV}
                className="bg-white border border-[#E5E5E0] hover:bg-[#F9F9F7] text-[#1A1A1A] px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Exporter les notes au format Excel / CSV"
              >
                <FileSpreadsheet size={16} className="text-emerald-700" />
                Excel
              </button>

              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md active:scale-95"
                title="Remplir les notes de toute une classe ou cours en une seule étape"
              >
                <Zap size={16} className="fill-slate-950" />
                Saisie Rapide par Classe
              </button>

              <button
                onClick={() => handleOpenModal()}
                className="bg-emerald-900 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Plus size={16} />
                Nouvelle Note
              </button>
            </>
          )}

          {activeTab === 'bulletins' && (
            <div className="flex items-center gap-2">
              <select
                value={bulletinPeriod}
                onChange={e => setBulletinPeriod(e.target.value)}
                className="bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl px-3 py-2 text-xs font-bold text-emerald-950 focus:outline-none"
              >
                <option value="1er Trimestre">1er Trimestre</option>
                <option value="2ème Trimestre">2ème Trimestre</option>
                <option value="3ème Trimestre">3ème Trimestre</option>
                <option value="Année Complète">Année Complète</option>
              </select>

              <button
                onClick={handleExportBulletinPDF}
                className="bg-emerald-900 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Download size={16} />
                Télécharger PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'grades' ? (
        <>
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-[#E5E5E0] shadow-sm flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9299]" size={16} />
              <input
                type="text"
                placeholder="Rechercher un élève ou un examen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20 font-medium"
              />
            </div>

            <div className="w-full md:w-60">
              <SearchableSelect
                value={filterStudentId}
                onChange={val => setFilterStudentId(val)}
                placeholder="Tous les élèves"
                options={[
                  { value: "all", label: `Tous les élèves (${students.length})` },
                  ...students.map(s => ({
                    value: s.id,
                    label: `${s.lastName.toUpperCase()} ${s.firstName}`,
                    sublabel: s.studentIdNumber ? `Matricule: ${s.studentIdNumber}` : undefined
                  }))
                ]}
              />
            </div>

            <div className="w-full md:w-60">
              <SearchableSelect
                value={filterCourseId}
                onChange={val => setFilterCourseId(val)}
                placeholder="Tous les cours"
                options={[
                  { value: "all", label: `Tous les cours (${courses.length})` },
                  ...courses.map(c => ({ value: c.id, label: c.name }))
                ]}
              />
            </div>
          </div>

          {/* Single Grades Table */}
          <div className="bg-white rounded-3xl border border-[#E5E5E0] shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-emerald-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-[#8E9299]">Chargement du registre de notes...</p>
              </div>
            ) : filteredGrades.length === 0 ? (
              <div className="p-12 text-center text-[#8E9299] space-y-3">
                <Award size={42} className="mx-auto text-emerald-900/30" />
                <p className="text-sm font-bold text-[#1A1A1A]">Aucune évaluation trouvée</p>
                <p className="text-xs text-[#8E9299]">Utilisez "Saisie Rapide par Classe" pour ajouter rapidement les notes de tout votre groupe d'élèves.</p>
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 bg-emerald-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md"
                >
                  <Zap size={14} className="fill-amber-400 text-amber-400" />
                  Lancer la Saisie Rapide
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F6] border-b border-[#E5E5E0] text-[10px] uppercase tracking-wider text-[#8E9299]">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Élève</th>
                      <th className="p-4">Cours / Discipline</th>
                      <th className="p-4">Évaluation</th>
                      <th className="p-4 text-center">Note / Bareme</th>
                      <th className="p-4 text-center">Note /20</th>
                      <th className="p-4 text-center">Coeff.</th>
                      <th className="p-4">Remarques</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0EE]">
                    {filteredGrades.map(g => {
                      const student = students.find(s => s.id === g.studentId);
                      const course = courses.find(c => c.id === g.courseId);
                      const scoreRatio = g.grade / (g.maxGrade || 20);
                      const score20 = (scoreRatio * 20).toFixed(2);

                      return (
                        <tr key={g.id} className="hover:bg-[#F9F9F7] transition-colors">
                          <td className="p-4 font-mono text-[#8E9299]">
                            {g.date ? new Date(g.date).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-emerald-900 text-white font-bold text-[10px] flex items-center justify-center overflow-hidden shrink-0">
                                {student?.photoUrl ? (
                                  <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span>{student?.firstName[0] || ''}{student?.lastName[0] || ''}</span>
                                )}
                              </div>
                              <span className="font-bold text-[#1A1A1A]">
                                {student ? `${student.firstName} ${student.lastName}` : 'Inconnu'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-[#8E9299] font-medium">
                            {course ? course.name : 'Inconnu'}
                          </td>
                          <td className="p-4 font-bold text-[#1A1A1A]">
                            {g.title}
                          </td>
                          <td className="p-4 text-center font-mono text-[#8E9299]">
                            {g.grade} / {g.maxGrade || 20}
                          </td>
                          <td className="p-4 text-center font-bold">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-mono ${
                              scoreRatio >= 0.7 
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                : scoreRatio >= 0.5 
                                ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                : 'bg-red-100 text-red-900 border border-red-300'
                            }`}>
                              {score20} / 20
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono text-[#8E9299]">
                            x{g.coefficient || 1}
                          </td>
                          <td className="p-4 text-[#8E9299] max-w-xs truncate">
                            {g.comments || '-'}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenModal(g)}
                                className="p-2 hover:bg-[#F0F0EE] rounded-xl text-[#8E9299] hover:text-[#1A1A1A] transition-colors"
                                title="Modifier cette note"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(g.id)}
                                className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Bulletin / Report Card View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Student Selector Sidebar */}
          <div className="bg-white p-4 rounded-3xl border border-[#E5E5E0] shadow-sm space-y-3 no-print">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E9299] mb-1">Élèves de l'Établissement</h3>
            
            {/* Quick Dropdown Selector */}
            <div>
              <select
                value={selectedStudentForBulletin}
                onChange={e => setSelectedStudentForBulletin(e.target.value)}
                className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
              >
                <option value="">-- Choisir un élève dans la liste --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.lastName.toUpperCase()} {s.firstName} {s.studentIdNumber ? `(${s.studentIdNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" size={14} />
              <input
                type="text"
                placeholder="Filtrer la liste..."
                value={bulletinSearch}
                onChange={e => setBulletinSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredStudentsForBulletin.map(s => {
                const isSelected = selectedStudentForBulletin === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentForBulletin(s.id)}
                    className={`w-full text-left p-2.5 rounded-2xl text-xs transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-emerald-900 text-white font-bold shadow-md'
                        : 'hover:bg-[#F9F9F7] text-[#1A1A1A]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden ${
                      isSelected ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-950'
                    }`}>
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{s.firstName[0]}{s.lastName[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate uppercase font-bold text-[11px] leading-tight">{s.lastName} {s.firstName}</p>
                      <p className={`text-[9px] truncate ${isSelected ? 'text-emerald-200' : 'text-[#8E9299]'}`}>
                        {s.studentIdNumber || 'Sans Matricule'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Printable Report Card Area */}
          <div className="md:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E5E0] shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
            {targetStudent ? (
              <>
                {/* Bulletin Header Box */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E5E0] pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-20 bg-slate-100 border border-emerald-900/30 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      {targetStudent.photoUrl ? (
                        <img src={targetStudent.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-lg text-emerald-900 uppercase">{targetStudent.firstName[0]}{targetStudent.lastName[0]}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        Bulletin Officiel — {bulletinPeriod}
                      </span>
                      <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] mt-1.5 uppercase">
                        {targetStudent.lastName} {targetStudent.firstName}
                      </h2>
                      <p className="text-xs text-[#8E9299] font-medium">
                        Matricule: <span className="font-mono font-bold text-[#1A1A1A]">{targetStudent.studentIdNumber || `STU-${targetStudent.id.slice(0, 5).toUpperCase()}`}</span> | Inscrit le: {targetStudent.registrationDate || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right bg-gradient-to-br from-[#F9F9F7] to-emerald-50/40 px-5 py-3 rounded-2xl border border-[#E5E5E0] shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">Moyenne Générale</p>
                      <p className="text-2xl font-serif font-extrabold text-emerald-950">
                        {calculateStudentAverage()} <span className="text-xs text-[#8E9299] font-normal">/ 20</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      <button
                        onClick={handleExportBulletinPDF}
                        className="px-4 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95"
                        title="Générer et télécharger le bulletin officiel au format PDF"
                      >
                        <Download size={16} />
                        Télécharger PDF
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="p-2.5 bg-[#F9F9F7] border border-[#E5E5E0] hover:bg-[#F0F0EE] rounded-2xl text-[#1A1A1A] transition-all"
                        title="Imprimer"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mention Badge Banner */}
                {studentGrades.length > 0 && (
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-amber-500" />
                      <span className="text-xs font-bold text-[#1A1A1A]">Mention Décernée :</span>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${getMentionBadge(currentAverageNum).bg}`}>
                      {getMentionBadge(currentAverageNum).text}
                    </span>
                  </div>
                )}

                {/* List of Student Grades */}
                {studentGrades.length === 0 ? (
                  <div className="p-12 text-center text-[#8E9299] bg-[#F9F9F7] rounded-2xl border border-dashed border-[#E5E5E0]">
                    <p className="text-xs font-medium">Aucune évaluation enregistrée pour cet élève.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-serif font-bold text-sm text-[#1A1A1A]">Récapitulatif des Évaluations</h3>
                    
                    <div className="border border-[#E5E5E0] rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF9F6] border-b border-[#E5E5E0] text-[10px] uppercase tracking-wider text-[#8E9299]">
                          <tr>
                            <th className="p-3">Matière / Cours</th>
                            <th className="p-3">Évaluation</th>
                            <th className="p-3 text-center">Note Brute</th>
                            <th className="p-3 text-center">Ramene /20</th>
                            <th className="p-3 text-center">Coeff.</th>
                            <th className="p-3">Remarques du Professeur</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F0EE]">
                          {studentGrades.map(g => {
                            const course = courses.find(c => c.id === g.courseId);
                            const score20 = ((g.grade / (g.maxGrade || 20)) * 20).toFixed(2);

                            return (
                              <tr key={g.id} className="hover:bg-[#F9F9F7]">
                                <td className="p-3 font-bold text-[#1A1A1A]">{course?.name || 'Inconnu'}</td>
                                <td className="p-3 text-[#8E9299] font-medium">{g.title}</td>
                                <td className="p-3 text-center font-mono text-[#8E9299]">{g.grade} / {g.maxGrade || 20}</td>
                                <td className="p-3 text-center font-bold text-emerald-900 font-mono">{score20} / 20</td>
                                <td className="p-3 text-center font-mono text-[#8E9299]">x{g.coefficient || 1}</td>
                                <td className="p-3 text-[#8E9299]">{g.comments || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* General Appreciation & Conseil Decision Form */}
                <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E5E5E0] space-y-4 print:bg-white print:border-none print:p-0">
                  <div className="flex items-center justify-between border-b border-[#E5E5E0] pb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-emerald-900" />
                      <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">
                        Appréciation Générale & Décision du Conseil
                      </h4>
                    </div>
                    <span className="text-[10px] text-[#8E9299] font-medium uppercase tracking-wider">
                      Saisie Enseignants / Direction
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
                        Avis du Conseil de Classe
                      </label>
                      <select
                        value={councilDecision}
                        onChange={e => setCouncilDecision(e.target.value)}
                        className="w-full bg-white border border-[#E5E5E0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1A1A1A] focus:outline-none"
                      >
                        <option value="">Sélectionner une décision officielle...</option>
                        {DECISION_OPTIONS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
                        Appréciation synthétique du professeur / directeur
                      </label>
                      <textarea
                        rows={3}
                        placeholder="ex: Élève très sérieux et assidu. Très bons résultats au cours de ce trimestre..."
                        value={appreciationText}
                        onChange={e => setAppreciationText(e.target.value)}
                        className="w-full bg-white border border-[#E5E5E0] rounded-xl p-3 text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                      />
                    </div>

                    <div className="flex justify-end pt-1 print:hidden">
                      <button
                        type="button"
                        onClick={handleSaveAppreciation}
                        disabled={savingAppreciation}
                        className="bg-emerald-900 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
                      >
                        <Save size={14} />
                        {savingAppreciation ? 'Sauvegarde...' : 'Enregistrer l\'Appréciation'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Official Signatures Section for Bulletin Printing */}
                <div className="pt-4 border-t border-[#E5E5E0] grid grid-cols-2 gap-6 text-xs font-sans mt-4">
                  <div className="border border-dashed border-[#CBD5E1] p-4 rounded-2xl text-center space-y-10 bg-[#FAF9F6]">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-[#64748B]">Signature & Cachet du Chef d'Établissement</p>
                    <p className="text-[9px] italic text-[#94A3B8]">Fait à ....................................., le .........................</p>
                  </div>
                  <div className="border border-dashed border-[#CBD5E1] p-4 rounded-2xl text-center space-y-10 bg-[#FAF9F6]">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-[#64748B]">Visa / Signature des Parents d'Élève</p>
                    <p className="text-[9px] italic text-[#94A3B8]">Vu et pris connaissance le .........................</p>
                  </div>
                </div>
              </>

            ) : (
              <div className="p-12 text-center text-[#8E9299]">
                <p className="text-xs">Veuillez sélectionner un élève dans la liste.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Add / Edit Single Grade */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#E5E5E0] shadow-xl w-full max-w-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#F0F0EE] pb-3">
                <h3 className="font-serif font-bold text-lg text-[#1A1A1A]">
                  {editingGrade ? 'Modifier la Note' : 'Ajouter une Évaluation'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#8E9299] hover:text-[#1A1A1A] text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Élève *</label>
                  <SearchableSelect
                    value={formData.studentId}
                    onChange={val => setFormData({ ...formData, studentId: val })}
                    placeholder="Chercher un élève par nom ou prénom..."
                    required={true}
                    options={students.map(s => ({
                      value: s.id,
                      label: `${s.lastName.toUpperCase()} ${s.firstName}`,
                      sublabel: s.studentIdNumber ? `Matricule: ${s.studentIdNumber}` : undefined
                    }))}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Cours *</label>
                  <SearchableSelect
                    value={formData.courseId}
                    onChange={val => setFormData({ ...formData, courseId: val })}
                    placeholder="Sélectionner un cours..."
                    required={true}
                    options={courses.map(c => ({ value: c.id, label: c.name }))}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Intitulé de l'Évaluation *</label>
                  <input
                    type="text"
                    placeholder="ex: Examen Trimestriel, Contrôle Continu 1..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                  />
                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {PRESET_TITLES.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, title: p })}
                        className="px-2 py-0.5 bg-[#F0F0EE] hover:bg-emerald-100 hover:text-emerald-900 rounded-lg text-[10px] font-medium text-[#8E9299]"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Note *</label>
                    <input
                      type="number"
                      step="0.25"
                      placeholder="15"
                      value={formData.grade}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      required
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Note Max</label>
                    <input
                      type="number"
                      placeholder="20"
                      value={formData.maxGrade}
                      onChange={e => setFormData({ ...formData, maxGrade: e.target.value })}
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Coefficient</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="1"
                      value={formData.coefficient}
                      onChange={e => setFormData({ ...formData, coefficient: e.target.value })}
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                </div>

                {/* Automated Live Calculation & Impact Preview */}
                {(() => {
                  if (!formData.studentId || !formData.courseId || !formData.grade) return null;
                  const numGrade = parseFloat(formData.grade);
                  const maxG = parseFloat(formData.maxGrade) || 20;
                  const coeff = parseFloat(formData.coefficient) || 1;
                  if (isNaN(numGrade) || maxG <= 0) return null;

                  const scoreOn20 = (numGrade / maxG) * 20;

                  const studentCourseGrades = grades.filter(
                    g => g.studentId === formData.studentId && 
                         g.courseId === formData.courseId && 
                         (!editingGrade || g.id !== editingGrade.id)
                  );

                  let prevScoreSum = 0;
                  let prevCoeffSum = 0;
                  studentCourseGrades.forEach(g => {
                    const norm = (g.grade / (g.maxGrade || 20)) * 20;
                    const c = g.coefficient || 1;
                    prevScoreSum += norm * c;
                    prevCoeffSum += c;
                  });

                  const prevAverage = prevCoeffSum > 0 ? prevScoreSum / prevCoeffSum : null;
                  const newScoreSum = prevScoreSum + (scoreOn20 * coeff);
                  const newCoeffSum = prevCoeffSum + coeff;
                  const projectedAverage = newCoeffSum > 0 ? newScoreSum / newCoeffSum : scoreOn20;

                  let autoAppreciation = 'Travail satisfaisant';
                  if (scoreOn20 >= 16) autoAppreciation = 'Excellente prestation, maîtrise parfaite des concepts';
                  else if (scoreOn20 >= 14) autoAppreciation = 'Très bon travail, élève appliqué';
                  else if (scoreOn20 >= 12) autoAppreciation = 'Bon travail d\'ensemble';
                  else if (scoreOn20 >= 10) autoAppreciation = 'Résultats passables, poursuivez les efforts';
                  else autoAppreciation = 'Résultat insuffisant, révisions nécessaires';

                  return (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                          Calcul Automatique & Simulation
                        </span>
                        <span className="font-mono font-extrabold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-lg">
                          {scoreOn20.toFixed(2)} / 20
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="bg-white p-2 rounded-xl border border-emerald-100">
                          <span className="text-[#8E9299] block text-[9px] uppercase font-bold">Moyenne Actuelle</span>
                          <span className="font-mono font-bold text-[#1A1A1A]">
                            {prevAverage !== null ? `${prevAverage.toFixed(2)} / 20` : 'Aucune note'}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-emerald-100">
                          <span className="text-[#8E9299] block text-[9px] uppercase font-bold">Moyenne Projetée</span>
                          <span className="font-mono font-bold text-emerald-900">
                            {projectedAverage.toFixed(2)} / 20
                            {prevAverage !== null && (
                              <span className={`text-[9px] ml-1.5 font-extrabold ${
                                projectedAverage >= prevAverage ? 'text-emerald-600' : 'text-red-500'
                              }`}>
                                ({projectedAverage >= prevAverage ? '+' : ''}{(projectedAverage - prevAverage).toFixed(2)})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 gap-2">
                        <span className="text-[10px] text-emerald-900 font-medium truncate">
                          Suggestion : "{autoAppreciation}"
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, comments: autoAppreciation })}
                          className="text-[10px] font-bold bg-emerald-900 text-white px-2 py-1 rounded-lg hover:bg-emerald-800 transition-all shrink-0"
                        >
                          Appliquer
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Observations / Remarques</label>
                  <textarea
                    placeholder="Remarques du professeur..."
                    value={formData.comments}
                    onChange={e => setFormData({ ...formData, comments: e.target.value })}
                    rows={2}
                    className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-[#F0F0EE]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-[#8E9299] hover:text-[#1A1A1A]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-900 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md"
                  >
                    {editingGrade ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Grade Entry Modal */}
      <BatchGradeEntryModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        courses={courses}
        students={students}
        enrollments={enrollments}
        existingGrades={grades}
        onSaveBatch={handleSaveBatch}
      />
    </div>
  );
};
