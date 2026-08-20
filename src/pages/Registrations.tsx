import React, { useEffect, useState, useCallback } from 'react';
import { useFirestore } from '../lib/hooks/useFirestore';
import { Search, Plus, UserPlus, Filter, Trash2, GraduationCap, ChevronDown, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Course, Enrollment, EnrollmentStatus } from '../types';
import { apiFetch } from '../lib/api';
import { SearchableSelect } from '../components/SearchableSelect';

export const Registrations: React.FC = () => {
  const { add, remove, update } = useFirestore<Enrollment>('enrollments');
  const { add: addPayment } = useFirestore<any>('payments');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<(Student & { id: string })[]>([]);
  const [courses, setCourses] = useState<(Course & { id: string })[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [regToDelete, setRegToDelete] = useState<Enrollment | null>(null);

  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    startDate: new Date().toISOString().split('T')[0],
    initialPayment: 0,
    status: 'active' as EnrollmentStatus
  });

  const fetchData = useCallback(async () => {
    setLoadingLocal(true);
    setError(null);
    try {
      const [regData, studentData, courseData, payData] = await Promise.all([
        apiFetch('/api/enrollments', { showToast: false }),
        apiFetch('/api/students', { showToast: false }),
        apiFetch('/api/courses', { showToast: false }),
        apiFetch('/api/payments', { showToast: false })
      ]);
      
      setEnrollments(Array.isArray(regData) ? regData : []);
      setStudents(Array.isArray(studentData) ? studentData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
      setPayments(Array.isArray(payData) ? payData : []);
    } catch (error) {
      console.error("Error fetching enrollment data:", error);
      setError("Erreur lors du chargement des données. Vérifiez vos permissions.");
    } finally {
      setLoadingLocal(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStudentName = (id: string) => {
    const safeStudents = Array.isArray(students) ? students : [];
    const s = safeStudents.find(s => s && s.id === id);
    return s ? `${s.firstName} ${s.lastName}` : 'Élève inconnu';
  };

  const getCourseName = (id: string) => {
    const safeCourses = Array.isArray(courses) ? courses : [];
    const c = safeCourses.find(c => c && c.id === id);
    return c ? c.name : 'Formation inconnue';
  };

  const getCoursePrice = (id: string) => {
    const safeCourses = Array.isArray(courses) ? courses : [];
    const c = safeCourses.find(c => c && c.id === id);
    return c ? c.price : 0;
  };

  const getBalance = (studentId: string, courseId: string) => {
    const price = getCoursePrice(courseId);
    const safePayments = Array.isArray(payments) ? payments : [];
    const totalPaid = safePayments
      .filter(p => p && p.studentId === studentId && p.courseId === courseId)
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    return price - totalPaid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if duplicate
    const safeEnrollments = Array.isArray(enrollments) ? enrollments : [];
    const exists = safeEnrollments.find(r => r && r.studentId === formData.studentId && r.courseId === formData.courseId);
    if (exists) {
      setError("Cet élève est déjà inscrit à cette formation.");
      return;
    }

    const price = getCoursePrice(formData.courseId);
    if (formData.initialPayment > price) {
      setError(`Le paiement initial (${formData.initialPayment.toLocaleString()} FCFA) ne peut pas dépasser le coût total de la formation (${price.toLocaleString()} FCFA).`);
      return;
    }

    try {
      const regData = {
        studentId: formData.studentId,
        courseId: formData.courseId,
        startDate: formData.startDate,
        status: formData.status
      };
      
      await add(regData);

      if (formData.initialPayment > 0) {
        await addPayment({
          studentId: formData.studentId,
          courseId: formData.courseId,
          amount: formData.initialPayment,
          paymentDate: formData.startDate,
          paymentMethod: 'cash',
          description: `Premier versement - ${getCourseName(formData.courseId)}`
        });
      }

      setIsModalOpen(false);
      setFormData({ 
        studentId: '', 
        courseId: '', 
        startDate: new Date().toISOString().split('T')[0], 
        initialPayment: 0,
        status: 'active'
      });
      fetchData();
    } catch (err) {
      setError("Erreur lors de l'enregistrement de l'inscription.");
    }
  };

  const handleUpdateStatus = async (regId: string, newStatus: EnrollmentStatus) => {
    try {
      await update(regId, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error("Error updating enrollment status:", err);
    }
  };

  const handleDelete = (reg: Enrollment) => {
    setRegToDelete(reg);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (regToDelete) {
      await remove(regToDelete.id);
      setIsDeleteModalOpen(false);
      setRegToDelete(null);
      fetchData();
    }
  };

  const exportToCSV = () => {
    const headers = ['Eleve', 'Formation', 'Statut', 'Prix (FCFA)', 'Reste a Payer (FCFA)', 'Date Debut'];
    const rows = filteredRegistrations.map(reg => [
      getStudentName(reg.studentId),
      getCourseName(reg.courseId),
      reg.status === 'active' ? 'Actif' : reg.status === 'completed' ? 'Terminé' : 'Abandonné',
      getCoursePrice(reg.courseId),
      getBalance(reg.studentId, reg.courseId),
      reg.startDate
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inscriptions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const safeEnrollments = Array.isArray(enrollments) ? enrollments : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const filteredRegistrations = safeEnrollments.filter(r => {
    const sName = getStudentName(r.studentId).toLowerCase();
    const matchesSearch = sName.includes(search.toLowerCase());
    const matchesCourse = courseFilter === '' || r.courseId === courseFilter;
    const matchesStatus = statusFilter === '' || r.status === statusFilter;
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const totalRevenue = safeEnrollments.reduce((acc, reg) => {
    const paymentsForReg = safePayments.filter(p => p && p.studentId === reg.studentId && p.courseId === reg.courseId);
    return acc + paymentsForReg.reduce((pAcc, p) => pAcc + (p.amount || 0), 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-[#E5E5E0] shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1">Total Inscriptions</p>
          <p className="text-3xl font-serif font-bold text-emerald-900">{enrollments.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#E5E5E0] shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1">Inscriptions Actives</p>
          <p className="text-3xl font-serif font-bold text-blue-600">{enrollments.filter(e => e.status === 'active').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#E5E5E0] shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1">Chiffre d'Affaires</p>
          <p className="text-3xl font-serif font-bold text-emerald-600">{totalRevenue.toLocaleString()} <span className="text-[10px]">FCFA</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#E5E5E0] shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1">Formations</p>
          <p className="text-3xl font-serif font-bold text-amber-600">{courses.length}</p>
        </div>
      </div>

      {/* Filters & Action */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299]" size={18} />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
            />
          </div>
          <div className="w-56">
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="completed">Terminé</option>
            <option value="dropped">Abandonné</option>
          </select>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={exportToCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-[#E5E5E0] text-[#1A1A1A] rounded-2xl hover:bg-[#F9F9F7] transition-all shadow-sm active:scale-95 text-sm font-medium"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-2xl hover:bg-emerald-900 transition-all shadow-md active:scale-95 text-sm font-medium"
          >
            <Plus size={18} />
            Nouvelle Inscription
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-[#E5E5E0] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#F9F9F7] text-[#8E9299] text-[10px] uppercase tracking-widest">
              <th className="px-8 py-4 font-bold">Élève</th>
              <th className="px-8 py-4 font-bold">Formation</th>
              <th className="px-8 py-4 font-bold">Statut</th>
              <th className="px-8 py-4 font-bold">Prix</th>
              <th className="px-8 py-4 font-bold">Reste à payer</th>
              <th className="px-8 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0EE]">
            {filteredRegistrations.length > 0 ? filteredRegistrations.map((reg) => {
              const balance = getBalance(reg.studentId, reg.courseId);
              return (
                <tr key={reg.id} className="hover:bg-[#F9F9F7] transition-colors group text-sm">
                  <td className="px-8 py-5 font-medium">{getStudentName(reg.studentId)}</td>
                  <td className="px-8 py-5">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-bold text-[10px] uppercase">
                      {getCourseName(reg.courseId)}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <select
                      value={reg.status}
                      onChange={(e) => handleUpdateStatus(reg.id, e.target.value as EnrollmentStatus)}
                      className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${
                        reg.status === 'active' ? 'bg-blue-50 text-blue-700' : 
                        reg.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 
                        'bg-red-50 text-red-700'
                      }`}
                    >
                      <option value="active">Actif</option>
                      <option value="completed">Terminé</option>
                      <option value="dropped">Abandon</option>
                    </select>
                  </td>
                  <td className="px-8 py-5">{getCoursePrice(reg.courseId).toLocaleString()} FCFA</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {balance === 0 ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <AlertCircle size={16} className="text-amber-500" />
                      )}
                      <span className={`font-bold ${balance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {balance === 0 ? 'Réglé' : `${balance.toLocaleString()} FCFA`}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button
                      onClick={() => handleDelete(reg)}
                      className="p-2 text-[#8E9299] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-[#8E9299] italic">
                  Aucune inscription trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white rounded-[2rem] shadow-2xl z-50 p-8 border border-[#E5E5E0]"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-900">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-serif text-2xl font-medium">Inscrire un élève</h3>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Choisir l'élève *</label>
                  <SearchableSelect
                    value={formData.studentId}
                    onChange={(val) => setFormData({ ...formData, studentId: val })}
                    placeholder="Taper pour chercher un élève..."
                    required={true}
                    options={students.map(s => ({
                      value: s.id,
                      label: `${s.firstName} ${s.lastName}`,
                      sublabel: s.phoneNumber ? `Tél: ${s.phoneNumber}` : undefined
                    }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Choisir la formation *</label>
                  <SearchableSelect
                    value={formData.courseId}
                    onChange={(val) => setFormData({ ...formData, courseId: val })}
                    placeholder="Taper pour chercher une formation..."
                    required={true}
                    options={courses.map(c => ({
                      value: c.id,
                      label: c.name,
                      sublabel: `Tarif: ${c.price.toLocaleString()} FCFA`
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Date d'effet</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Paiement Initial (FCFA)</label>
                    <input
                      type="number"
                      value={formData.initialPayment || ''}
                      onChange={(e) => setFormData({ ...formData, initialPayment: Number(e.target.value) })}
                      placeholder="Optionnel"
                      className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-emerald-900"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
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
                    Confirmer
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
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
              <h3 className="font-serif text-xl font-medium mb-2">Désinscrire l'élève</h3>
              <p className="text-sm text-[#8E9299] mb-8">
                Voulez-vous vraiment retirer <span className="font-semibold text-[#1A1A1A]">{getStudentName(regToDelete?.studentId || '')}</span> de la formation <span className="font-semibold text-[#1A1A1A]">{getCourseName(regToDelete?.courseId || '')}</span> ?
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
                  Désinscrire
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
