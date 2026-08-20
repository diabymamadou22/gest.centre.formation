import React, { useEffect, useState, useCallback } from 'react';
import { useFirestore } from '../lib/hooks/useFirestore';
import { Student } from '../types';
import { Search, Plus, UserPlus, Filter, MoreHorizontal, Edit, Trash2, Mail, Phone, ChevronRight, Users, Download, FileText, Smartphone, Award, FileSpreadsheet, IdCard, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { apiFetch } from '../lib/api';
import { exportStudentsPDF, exportStudentCertificatePDF, exportBatchStudentCardsPDF } from '../lib/pdfExport';
import { exportToCSV } from '../lib/excelExport';
import { PhotoUploader } from '../components/PhotoUploader';
import { StudentCardModal } from '../components/StudentCardModal';
import { SearchableSelect } from '../components/SearchableSelect';
import { StudentImportModal } from '../components/StudentImportModal';

export const Students: React.FC = () => {
  const { list: listStudents, add: addStudent, update: updateStudent, remove: removeStudent, loading: loadingStudents } = useFirestore<Student>('students');
  const { add: addRegistration, remove: removeRegistration } = useFirestore<any>('enrollments');
  const [students, setStudents] = useState<(Student & { id: string })[]>([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<(Student & { id: string }) | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<(Student & { id: string }) | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  
  // Card Modal state
  const [cardStudent, setCardStudent] = useState<(Student & { id: string }) | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(true);

  const fetchDependencies = useCallback(async () => {
    setIsLoadingDependencies(true);
    try {
      const [regData, courseData, payData] = await Promise.all([
        apiFetch('/api/enrollments', { showToast: false }),
        apiFetch('/api/courses', { showToast: false }),
        apiFetch('/api/payments', { showToast: false })
      ]);
      setRegistrations(Array.isArray(regData) ? regData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
      setPayments(Array.isArray(payData) ? payData : []);
    } catch (error) {
      console.error("Error fetching dependencies:", error);
    } finally {
      setIsLoadingDependencies(false);
    }
  }, []);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const getStudentBalance = (studentId: string, courseId?: string) => {
    const safeRegs = Array.isArray(registrations) ? registrations : [];
    const safePayments = Array.isArray(payments) ? payments : [];
    const safeCourses = Array.isArray(courses) ? courses : [];

    const studentRegs = safeRegs.filter(r => r && r.studentId === studentId && (!courseId || r.courseId === courseId));
    const totalFees = studentRegs.reduce((acc, reg) => {
      const course = safeCourses.find(c => c && c.id === reg.courseId);
      return acc + (course?.price || 0);
    }, 0);
    
    // Total paid for THIS course OR total paid globally if no courseId specified
    const totalPaid = safePayments
      .filter(p => p && p.studentId === studentId && (!courseId || p.courseId === courseId))
      .reduce((acc, p) => acc + (p.amount || 0), 0);
      
    return totalFees - totalPaid;
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    photoUrl: '',
    studentIdNumber: '',
    emergencyContact: '',
    registrationDate: new Date().toISOString().split('T')[0],
    status: 'active' as const,
    selectedCourseIds: [] as string[]
  });

  const fetchStudents = useCallback(async () => {
    const data = await listStudents();
    setStudents(data);
  }, [listStudents]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { selectedCourseIds, ...studentData } = formData;
    
    let studentId = editingStudent?.id;
    
    if (editingStudent) {
      await updateStudent(editingStudent.id, studentData);
    } else {
      const newStudent = await addStudent(studentData);
      studentId = (newStudent as any).id;
    }

    if (studentId) {
      // Sync registrations
      const safeRegs = Array.isArray(registrations) ? registrations : [];
      const currentRegs = safeRegs.filter(r => r.studentId === studentId);
      const currentCourseIds = currentRegs.map(r => r.courseId);

      // Add new ones
      for (const courseId of selectedCourseIds) {
        if (!currentCourseIds.includes(courseId)) {
          await addRegistration({
            studentId,
            courseId,
            enrolledAt: new Date().toISOString()
          });
        }
      }

      // Remove unselected ones (only if editing)
      if (editingStudent) {
        for (const reg of currentRegs) {
          if (!selectedCourseIds.includes(reg.courseId)) {
            await removeRegistration(reg.id);
          }
        }
      }
    }

    setIsModalOpen(false);
    setEditingStudent(null);
    setFormData({ 
      firstName: '', 
      lastName: '', 
      phoneNumber: '', 
      email: '', 
      photoUrl: '',
      studentIdNumber: '',
      emergencyContact: '',
      registrationDate: new Date().toISOString().split('T')[0], 
      status: 'active',
      selectedCourseIds: []
    });
    fetchStudents();
    
    // Refresh registrations via apiFetch safely
    const regData = await apiFetch('/api/enrollments', { showToast: false });
    setRegistrations(Array.isArray(regData) ? regData : []);
  };

  const handleEdit = (student: Student & { id: string }) => {
    const safeRegs = Array.isArray(registrations) ? registrations : [];
    const studentCourseIds = safeRegs
      .filter(r => r.studentId === student.id)
      .map(r => r.courseId);

    setEditingStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      phoneNumber: student.phoneNumber || '',
      email: student.email || '',
      photoUrl: student.photoUrl || '',
      studentIdNumber: student.studentIdNumber || '',
      emergencyContact: student.emergencyContact || '',
      registrationDate: student.registrationDate || (student.createdAt ? student.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      status: student.status,
      selectedCourseIds: studentCourseIds
    });
    setIsModalOpen(true);
  };

  const handleOpenCardModal = (student: Student & { id: string }) => {
    setCardStudent(student);
    setIsCardModalOpen(true);
  };

  const handleExportBatchCards = () => {
    if (filteredStudents.length === 0) {
      toast.error("Aucun élève à exporter");
      return;
    }
    try {
      exportBatchStudentCardsPDF({
        students: filteredStudents,
        courses,
        registrations,
        centerInfo: { name: 'kalan gest KG' }
      });
      toast.success(`Planche de ${filteredStudents.length} cartes scolaires PDF générée !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération des cartes scolaires");
    }
  };

  const handleDelete = (student: Student & { id: string }) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (studentToDelete) {
      await removeStudent(studentToDelete.id);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      fetchStudents();
    }
  };

  const safeStudentsList = Array.isArray(students) ? students : [];
  const safeRegsList = Array.isArray(registrations) ? registrations : [];

  const filteredStudents = safeStudentsList.filter(s => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    
    if (courseFilter === '') return matchesSearch;
    
    const studentRegs = safeRegsList.filter(r => r.studentId === s.id);
    const matchesCourse = studentRegs.some(r => r.courseId === courseFilter);
    
    return matchesSearch && matchesCourse;
  });

  const handleExportPDF = () => {
    try {
      exportStudentsPDF({
        students: filteredStudents,
        courses,
        registrations,
        payments,
        courseFilterId: courseFilter,
        searchQuery: search,
      });
      toast.success('Export PDF de la liste des élèves généré avec succès');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['#', 'Prénom', 'Nom', 'Téléphone', 'Email', 'Formations Inscrites', 'Solde Restant Dû FCFA', 'Statut'];
      const rows = filteredStudents.map((s, index) => {
        const studentRegs = registrations.filter(r => r.studentId === s.id);
        const courseNames = studentRegs.map(r => courses.find(c => c.id === r.courseId)?.name).filter(Boolean).join(', ');
        const balance = getStudentBalance(s.id);
        return [
          index + 1,
          s.firstName,
          s.lastName,
          s.phoneNumber || '',
          s.email || '',
          courseNames || 'Aucune',
          balance > 0 ? balance : 0,
          s.status === 'active' ? 'Actif' : 'Inactif'
        ];
      });

      exportToCSV(`liste_eleves_${new Date().toISOString().split('T')[0]}`, headers, rows);
      toast.success('Fichier Excel / CSV téléchargé avec succès');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const handleGenerateCertificate = (student: Student & { id: string }, course: any) => {
    try {
      exportStudentCertificatePDF({
        student,
        course,
      });
      toast.success(`Attestation de formation générée pour ${student.firstName} ${student.lastName}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération de l'attestation");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299]" size={18} />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm"
            />
          </div>
          <div className="w-full sm:w-64">
            <SearchableSelect
              value={courseFilter}
              onChange={(val) => setCourseFilter(val)}
              placeholder="Toutes les formations"
              options={[
                { value: "", label: "Toutes les formations" },
                ...courses.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-800 text-white rounded-2xl hover:bg-emerald-900 transition-all shadow-sm active:scale-95 text-xs font-bold uppercase tracking-wider"
            title="Importer la liste des élèves depuis un fichier Excel / CSV"
          >
            <FileSpreadsheet size={16} />
            Importer Excel
          </button>

          <button
            onClick={handleExportBatchCards}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-950 text-white border border-emerald-950 rounded-2xl hover:bg-emerald-900 transition-all shadow-sm active:scale-95 text-xs font-bold uppercase tracking-wider"
            title="Générer et imprimer le lot de cartes scolaires pour tous les élèves"
          >
            <IdCard size={16} />
            Cartes (Lot)
          </button>

          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#E5E5E0] hover:bg-[#F9F9F7] text-[#1A1A1A] rounded-2xl transition-all shadow-sm active:scale-95 text-xs font-bold uppercase tracking-wider"
            title="Exporter vers Microsoft Excel / CSV"
          >
            <FileSpreadsheet size={16} className="text-emerald-700" />
            Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-2xl hover:bg-emerald-100/80 transition-all shadow-sm active:scale-95 text-xs font-bold uppercase tracking-wider"
            title="Exporter la liste actuelle des élèves au format PDF"
          >
            <Download size={16} />
            PDF
          </button>

          <button
            onClick={() => { setEditingStudent(null); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-[#1A1A1A] text-white rounded-2xl hover:bg-emerald-900 transition-all shadow-md active:scale-95 text-xs font-bold uppercase tracking-wider shrink-0"
          >
            <UserPlus size={16} />
            Nouvel Élève
          </button>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-3xl border border-[#E5E5E0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F9F9F7] text-[#8E9299] text-[10px] uppercase tracking-widest">
                <th className="px-8 py-4 font-bold">Profil</th>
                <th className="px-8 py-4 font-bold">Contact</th>
                <th className="px-8 py-4 font-bold">Statut</th>
                <th className="px-8 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EE]">
              {filteredStudents.length > 0 ? filteredStudents.map((s, sIdx) => (
                <React.Fragment key={`${s.id}-${sIdx}`}>
                  <tr className="hover:bg-[#F9F9F7] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-emerald-100 border border-emerald-200/80 rounded-xl overflow-hidden flex items-center justify-center text-emerald-700 font-bold text-sm uppercase shrink-0 shadow-sm">
                          {s.photoUrl ? (
                            <img src={s.photoUrl} alt={`${s.firstName} ${s.lastName}`} className="w-full h-full object-cover" />
                          ) : (
                            <span>{s.firstName.charAt(0)}{s.lastName.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{s.firstName} {s.lastName}</p>
                            {s.studentIdNumber && (
                              <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold">
                                {s.studentIdNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {registrations.filter(r => r.studentId === s.id).map((reg, regIdx) => {
                              const course = courses.find(c => c.id === reg.courseId);
                              return (
                                <span key={`${reg.id}-${regIdx}`} className="text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                                  {course?.name}
                                </span>
                              );
                            })}
                            {registrations.filter(r => r.studentId === s.id).length === 0 && (
                              <p className="text-[10px] text-[#8E9299]">Aucune formation</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        {s.phoneNumber && (
                          <span className="text-xs text-[#555] flex items-center gap-2">
                            <Phone size={12} className="text-[#8E9299]" /> {s.phoneNumber}
                          </span>
                        )}
                        {s.email && (
                          <span className="text-xs text-[#555] flex items-center gap-2">
                            <Mail size={12} className="text-[#8E9299]" /> {s.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {s.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-6">
                        <div className="text-right">
                          <p className={`text-xs font-bold ${getStudentBalance(s.id) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {getStudentBalance(s.id) > 0 ? `${getStudentBalance(s.id).toLocaleString()} FCFA` : 'Réglé'}
                          </p>
                          <button 
                            onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}
                            className="text-[10px] text-[#8E9299] hover:text-emerald-600 font-bold uppercase tracking-tighter transition-colors"
                          >
                            Détails
                          </button>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenCardModal(s)}
                            className="p-2 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Afficheur / Télécharger la Carte Scolaire"
                          >
                            <IdCard size={18} />
                          </button>
                          <button 
                            onClick={() => handleEdit(s)}
                            className="p-2 text-[#8E9299] hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Modifier les informations"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(s)}
                            className="p-2 text-[#8E9299] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer l'élève"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {expandedStudent === s.id && (
                    <tr key={`${s.id}-details`} className="bg-[#F9F9F7]/50">
                      <td colSpan={4} className="px-8 py-0">
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="pb-6 pt-2 border-t border-[#F0F0EE]"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299]">Statut par formation & Documents</h4>
                            {s.phoneNumber && (
                              <button
                                onClick={() => {
                                  const cleaned = s.phoneNumber.replace(/[^0-9]/g, '');
                                  window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(`Bonjour ${s.firstName}, nous vous contactons depuis le Centre.`)}`, '_blank');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                              >
                                <Smartphone size={14} />
                                Contacter WhatsApp
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {registrations.filter(r => r.studentId === s.id).map((reg, regIdx) => {
                              const course = courses.find(c => c.id === reg.courseId);
                              const balance = getStudentBalance(s.id, reg.courseId);
                              
                              return (
                                <div key={`${reg.id}-${regIdx}`} className="flex justify-between items-center p-3.5 bg-white rounded-2xl border border-[#E5E5E0]">
                                  <div>
                                    <p className="text-xs font-bold text-[#1A1A1A]">{course?.name}</p>
                                    <p className="text-[10px] text-[#8E9299]">Prix: {course?.price?.toLocaleString('fr-FR')} FCFA</p>
                                    <p className={`text-[11px] font-bold mt-0.5 ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {balance > 0 ? `Reste: ${balance.toLocaleString('fr-FR')} FCFA` : 'Scolarité réglée'}
                                    </p>
                                  </div>
                                  {course && (
                                    <button
                                      onClick={() => handleGenerateCertificate(s, course)}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-[10px] font-bold hover:bg-amber-100 transition-all"
                                      title="Télécharger le certificat officiel de formation"
                                    >
                                      <Award size={13} />
                                      Attestation PDF
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {registrations.filter(r => r.studentId === s.id).length === 0 && (
                              <p className="text-xs text-[#8E9299] italic">Aucune inscription active.</p>
                            )}
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-[#8E9299]">
                      <Users size={48} strokeWidth={1} className="opacity-20 mb-2" />
                      <p className="text-sm font-medium">Aucun élève trouvé</p>
                      <p className="text-xs opacity-60">Ajoutez votre premier élève pour commencer.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-[#1A1A1A]/30 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-lg h-fit max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl z-50 p-6 sm:p-8 border border-[#E5E5E0]"
            >
              <h3 className="font-serif text-2xl font-medium mb-4">
                {editingStudent ? 'Modifier l\'élève' : 'Ajouter un nouvel élève'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Photo Uploader Component */}
                <PhotoUploader
                  value={formData.photoUrl}
                  onChange={(photoBase64) => setFormData({ ...formData, photoUrl: photoBase64 })}
                  onRemove={() => setFormData({ ...formData, photoUrl: '' })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Prénom</label>
                    <input
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Nom</label>
                    <input
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">N° Matricule (Carte)</label>
                    <input
                      placeholder="ex: KG-2026-001"
                      value={formData.studentIdNumber}
                      onChange={(e) => setFormData({ ...formData, studentIdNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Urgence / Parent</label>
                    <input
                      placeholder="Nom / Tél. Parent"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Téléphone Élève</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Date d'inscription</label>
                    <input
                      type="date"
                      required
                      value={formData.registrationDate}
                      onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Statut</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Formations (Inscriptions)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl">
                    {courses.map(course => {
                      const isSelected = formData.selectedCourseIds.includes(course.id);
                      return (
                        <label 
                          key={course.id} 
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' 
                              : 'bg-white border-[#F0F0EE] text-[#1A1A1A] hover:border-emerald-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-[#E5E5E0]"
                              checked={isSelected}
                              onChange={(e) => {
                                const ids = e.target.checked 
                                  ? [...formData.selectedCourseIds, course.id]
                                  : formData.selectedCourseIds.filter(id => id !== course.id);
                                setFormData({ ...formData, selectedCourseIds: ids });
                              }}
                            />
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold truncate uppercase">{course.name}</p>
                              <p className="text-[10px] opacity-60 font-medium">{course.price?.toLocaleString()} FCFA</p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                    {courses.length === 0 && <p className="col-span-2 text-xs text-[#8E9299] italic text-center py-4">Aucune formation disponible.</p>}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-[#E5E5E0] rounded-xl text-sm font-semibold text-[#8E9299] hover:bg-[#F9F9F7] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-900 text-white rounded-xl text-sm font-semibold hover:bg-emerald-950 transition-all shadow-md active:scale-95"
                  >
                    {editingStudent ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-[#1A1A1A]/30 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-white rounded-[2rem] shadow-2xl z-50 p-8 border border-[#E5E5E0] text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="font-serif text-xl font-medium mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-[#8E9299] mb-8">
                Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-[#1A1A1A]">{studentToDelete?.firstName} {studentToDelete?.lastName}</span> ? 
                Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-[#E5E5E0] rounded-xl text-sm font-semibold text-[#8E9299] hover:bg-[#F9F9F7] transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all shadow-md active:scale-95"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Student Card Modal */}
      <StudentCardModal
        isOpen={isCardModalOpen}
        onClose={() => { setIsCardModalOpen(false); setCardStudent(null); }}
        student={cardStudent}
        courses={courses}
        registrations={registrations}
        centerName="kalan gest KG"
      />

      {/* Student Excel Import Modal */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        courses={courses}
        onSuccess={() => {
          fetchStudents();
          fetchDependencies();
        }}
      />
    </div>
  );
};
