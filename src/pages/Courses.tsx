import React, { useEffect, useState, useCallback } from 'react';
import { useFirestore } from '../lib/hooks/useFirestore';
import { Course } from '../types';
import { apiFetch, teachersApi } from '../lib/api';
import { Search, Plus, BookOpen, Clock, User, DollarSign, Edit, Trash2, GraduationCap, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { exportToCSV } from '../lib/excelExport';
import { SearchableSelect } from '../components/SearchableSelect';

export const Courses: React.FC = () => {
  const { list, add, update, remove, loading } = useFirestore<Course>('courses');
  const [courses, setCourses] = useState<(Course & { id: string })[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<(Course & { id: string }) | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<(Course & { id: string }) | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teacher: '',
    schedule: '',
    price: 0
  });

  const fetchCourses = useCallback(async () => {
    const data = await list();
    setCourses(data);
  }, [list]);

  const fetchTeachers = useCallback(async () => {
    try {
      const data = await teachersApi.list();
      setTeachers(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, [fetchCourses, fetchTeachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourse) {
      await update(editingCourse.id, formData);
    } else {
      await add(formData);
    }
    setIsModalOpen(false);
    setEditingCourse(null);
    setFormData({ name: '', description: '', teacher: '', schedule: '', price: 0 });
    fetchCourses();
  };

  const handleEdit = (course: Course & { id: string }) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description || '',
      teacher: course.teacher || '',
      schedule: course.schedule || '',
      price: course.price
    });
    setIsModalOpen(true);
  };

  const handleDelete = (course: Course & { id: string }) => {
    setCourseToDelete(course);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (courseToDelete) {
      await remove(courseToDelete.id);
      setIsDeleteModalOpen(false);
      setCourseToDelete(null);
      fetchCourses();
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['#', 'Nom de la Formation', 'Description', 'Formateur', 'Horaire', 'Prix FCFA'];
      const rows = courses.map((c, index) => [
        index + 1,
        c.name,
        c.description || '',
        c.teacher || '',
        c.schedule || '',
        c.price || 0
      ]);
      exportToCSV(`liste_formations_${new Date().toISOString().split('T')[0]}`, headers, rows);
      toast.success('Liste des formations exportée en Excel');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">Catalogue des Formations</h2>
          <p className="text-xs text-[#8E9299]">Gérez les cours, plannings et tarifs de scolarité</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-[#E5E5E0] hover:bg-[#F9F9F7] text-[#1A1A1A] rounded-2xl transition-all shadow-sm active:scale-95 text-xs font-bold uppercase tracking-wider"
            title="Exporter le catalogue des formations au format Excel"
          >
            <FileSpreadsheet size={16} className="text-emerald-700" />
            Excel
          </button>

          <button
            onClick={() => { setEditingCourse(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-2xl hover:bg-emerald-900 transition-all shadow-md active:scale-95 text-xs font-bold uppercase tracking-wider"
          >
            <Plus size={16} />
            Nouvelle Formation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.length > 0 ? courses.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-white rounded-[2rem] border border-[#E5E5E0] p-8 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700">
                <BookOpen size={28} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(course)} className="p-2 text-[#8E9299] hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(course)} className="p-2 text-[#8E9299] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-serif font-semibold mb-2 group-hover:text-emerald-900 transition-colors uppercase tracking-tight">{course.name}</h3>
            <p className="text-xs text-[#8E9299] leading-relaxed mb-6 line-clamp-2">{course.description || 'Apprentissage approfondi du Noble Coran.'}</p>

            <div className="space-y-3 pt-6 border-t border-[#F0F0EE]">
              <div className="flex items-center gap-3 text-xs text-[#555]">
                <User size={14} className="text-emerald-600" />
                <span className="font-medium">{course.teacher || 'Formateur à définir'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#555]">
                <Clock size={14} className="text-emerald-600" />
                <span>{course.schedule || 'Horaire à définir'}</span>
              </div>
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-1.5 text-lg font-bold text-emerald-900">
                  <DollarSign size={18} />
                  {course.price.toLocaleString()} <span className="text-[10px] font-medium text-[#8E9299] ml-1 uppercase">FCFA</span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 text-emerald-50 opacity-[0.4] pointer-events-none group-hover:scale-110 transition-transform duration-500">
              <GraduationCap size={100} />
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center">
            <BookOpen size={48} strokeWidth={1} className="mx-auto text-[#8E9299] opacity-20 mb-4" />
            <p className="text-[#8E9299] font-medium">Aucune formation disponible</p>
          </div>
        )}
      </div>

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
              className="fixed inset-0 m-auto w-full max-w-lg h-fit bg-white rounded-[2rem] shadow-2xl z-50 p-8 border border-[#E5E5E0]"
            >
              <h3 className="font-serif text-2xl font-medium mb-6 uppercase tracking-tight">
                {editingCourse ? 'Modifier la formation' : 'Nouvelle Formation'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Nom de la formation</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Formateur</label>
                    <SearchableSelect
                      value={formData.teacher}
                      onChange={(val) => setFormData({ ...formData, teacher: val })}
                      placeholder="Chercher ou taper le nom du formateur..."
                      allowCustomValue={true}
                      options={teachers.map(t => ({
                        value: `${t.firstName} ${t.lastName}`,
                        label: `${t.firstName} ${t.lastName}`,
                        sublabel: t.specialty ? `Spécialité: ${t.specialty}` : undefined
                      }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Prix (FCFA)</label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Horaires</label>
                  <input
                    placeholder="ex: Lun-Mer-Ven, 17:00 - 19:00"
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-[#E5E5E0] rounded-xl text-sm font-semibold text-[#8E9299] hover:bg-[#F9F9F7] transition-all">Annuler</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-emerald-900 text-white rounded-xl text-sm font-semibold hover:bg-emerald-950 transition-all shadow-md active:scale-95">
                    {editingCourse ? 'Mettre à jour' : 'Enregistrer'}
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
              <h3 className="font-serif text-xl font-medium mb-2 uppercase tracking-tight">Confirmer la suppression</h3>
              <p className="text-sm text-[#8E9299] mb-8">
                Êtes-vous sûr de vouloir supprimer la formation <span className="font-semibold text-[#1A1A1A]">{courseToDelete?.name}</span> ? 
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
    </div>
  );
};
