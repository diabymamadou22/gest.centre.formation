import React, { useEffect, useState } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  BookOpen, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Briefcase,
  IdCard
} from 'lucide-react';
import { teachersApi, coursesApi } from '../lib/api';
import { Teacher, Course } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { PhotoUploader } from '../components/PhotoUploader';
import { TeacherCardModal } from '../components/TeacherCardModal';
import { exportBatchTeacherCardsPDF } from '../lib/pdfExport';

export const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Teacher Card Modal state
  const [selectedCardTeacher, setSelectedCardTeacher] = useState<(Teacher & { id: string }) | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    specialty: '',
    teacherIdNumber: '',
    photoUrl: '',
    status: 'active' as 'active' | 'inactive',
    bio: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tData, cData] = await Promise.all([
        teachersApi.list(),
        coursesApi.list()
      ]);
      setTeachers(tData || []);
      setCourses(cData || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (teacherToEdit?: Teacher) => {
    if (teacherToEdit) {
      setEditingTeacher(teacherToEdit);
      setFormData({
        firstName: teacherToEdit.firstName,
        lastName: teacherToEdit.lastName,
        email: teacherToEdit.email || '',
        phoneNumber: teacherToEdit.phoneNumber || '',
        specialty: teacherToEdit.specialty || '',
        teacherIdNumber: teacherToEdit.teacherIdNumber || '',
        photoUrl: teacherToEdit.photoUrl || '',
        status: teacherToEdit.status || 'active',
        bio: teacherToEdit.bio || ''
      });
    } else {
      setEditingTeacher(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        specialty: '',
        teacherIdNumber: '',
        photoUrl: '',
        status: 'active',
        bio: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenCard = (teacher: Teacher) => {
    setSelectedCardTeacher(teacher as Teacher & { id: string });
    setIsCardModalOpen(true);
  };

  const handleExportBatchCards = () => {
    if (filteredTeachers.length === 0) {
      toast.error("Aucun enseignant à exporter");
      return;
    }
    try {
      exportBatchTeacherCardsPDF({
        teachers: filteredTeachers as (Teacher & { id: string })[],
        centerInfo: { name: 'kalan gest KG' }
      });
      toast.success(`Planche de ${filteredTeachers.length} cartes professionnelles PDF générée !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération des cartes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toast.error('Le prénom et le nom sont obligatoires');
      return;
    }

    try {
      if (editingTeacher) {
        await teachersApi.update(editingTeacher.id, formData);
      } else {
        await teachersApi.create(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving teacher:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet enseignant ?')) return;
    try {
      await teachersApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Delete teacher error:', error);
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          (t.specialty && t.specialty.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E0] shadow-sm">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">Corps Enseignant & Formateurs</h2>
          <p className="text-xs text-[#8E9299] mt-0.5">Gérez les professeurs, leurs spécialités et leurs cartes professionnelles.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportBatchCards}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            title="Générer et imprimer le lot de cartes professionnelles pour tous les enseignants"
          >
            <IdCard size={16} />
            Cartes Pro (Lot)
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-emerald-900 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Plus size={16} />
            Ajouter un Enseignant
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E5E0] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9299]" size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou spécialité..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'all' ? 'bg-emerald-900 text-white' : 'bg-[#F9F9F7] text-[#8E9299] hover:text-[#1A1A1A]'
            }`}
          >
            Tous ({teachers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'active' ? 'bg-emerald-900 text-white' : 'bg-[#F9F9F7] text-[#8E9299] hover:text-[#1A1A1A]'
            }`}
          >
            Actifs ({teachers.filter(t => t.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'inactive' ? 'bg-emerald-900 text-white' : 'bg-[#F9F9F7] text-[#8E9299] hover:text-[#1A1A1A]'
            }`}
          >
            Inactifs ({teachers.filter(t => t.status === 'inactive').length})
          </button>
        </div>
      </div>

      {/* Teachers Cards Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E5E0]">
          <div className="w-8 h-8 border-4 border-emerald-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-[#8E9299]">Chargement de la liste des enseignants...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E5E0] text-[#8E9299]">
          <Briefcase size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs font-medium">Aucun enseignant trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map(t => {
            // Find courses taught by this teacher
            const teacherCourses = courses.filter(c => c.teacher === `${t.firstName} ${t.lastName}` || c.teacherId === t.id);

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-2xl border border-[#E5E5E0] shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-900/30 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-900 text-white font-serif font-bold text-base rounded-xl flex items-center justify-center shadow-sm overflow-hidden shrink-0 border border-slate-700">
                        {t.photoUrl ? (
                          <img src={t.photoUrl} alt={`${t.firstName} ${t.lastName}`} className="w-full h-full object-cover" />
                        ) : (
                          <span>{t.firstName.charAt(0)}{t.lastName.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-base text-[#1A1A1A] leading-tight">
                            {t.firstName} {t.lastName}
                          </h3>
                          {t.teacherIdNumber && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                              {t.teacherIdNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-800 font-medium">{t.specialty || 'Professeur Généraliste'}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      t.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
                    }`}>
                      {t.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  {t.bio && (
                    <p className="text-xs text-[#8E9299] line-clamp-2 mb-3 italic">
                      "{t.bio}"
                    </p>
                  )}

                  {/* Contacts */}
                  <div className="space-y-1.5 pt-3 border-t border-[#F0F0EE] text-xs text-[#8E9299]">
                    {t.phoneNumber && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-emerald-900" />
                        <a href={`tel:${t.phoneNumber}`} className="hover:underline text-[#1A1A1A]">
                          {t.phoneNumber}
                        </a>
                      </div>
                    )}
                    {t.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-emerald-900" />
                        <a href={`mailto:${t.email}`} className="hover:underline text-[#1A1A1A]">
                          {t.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Courses Tag */}
                  <div className="mt-4 pt-3 border-t border-[#F0F0EE]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] mb-1.5 flex items-center gap-1">
                      <BookOpen size={12} /> Cours assignés ({teacherCourses.length})
                    </p>
                    {teacherCourses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {teacherCourses.map(c => (
                          <span key={c.id} className="bg-[#F9F9F7] text-[#1A1A1A] border border-[#E5E5E0] px-2 py-0.5 rounded-md text-[10px]">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#8E9299] italic">Aucun cours affecté</span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F0F0EE]">
                  <button
                    onClick={() => handleOpenCard(t)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-200"
                    title="Afficher la carte professionnelle"
                  >
                    <IdCard size={14} /> Carte Pro
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(t)}
                      className="px-3 py-1.5 bg-[#F9F9F7] hover:bg-[#F0F0EE] text-[#1A1A1A] rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Modifier les détails"
                    >
                      <Edit2 size={14} /> Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Supprimer l'enseignant"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Teacher */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#E5E5E0] shadow-xl w-full max-w-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#F0F0EE] pb-3">
                <h3 className="font-serif font-bold text-lg text-[#1A1A1A]">
                  {editingTeacher ? 'Modifier l\'Enseignant' : 'Ajouter un Enseignant'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#8E9299] hover:text-[#1A1A1A] text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Photo Uploader */}
                <PhotoUploader
                  value={formData.photoUrl}
                  onChange={(photoBase64) => setFormData({ ...formData, photoUrl: photoBase64 })}
                  onRemove={() => setFormData({ ...formData, photoUrl: '' })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Prénom *</label>
                    <input
                      type="text"
                      placeholder="Mamadou"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Nom *</label>
                    <input
                      type="text"
                      placeholder="Diaby"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Matricule / N° Badge</label>
                    <input
                      type="text"
                      placeholder="ex: ENS-2026-01"
                      value={formData.teacherIdNumber}
                      onChange={e => setFormData({ ...formData, teacherIdNumber: e.target.value })}
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="+223 70 00 00 00"
                      value={formData.phoneNumber}
                      onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="prof@exemple.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Spécialité / Discipline</label>
                    <input
                      type="text"
                      placeholder="ex: Informatique, Anglais..."
                      value={formData.specialty}
                      onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Statut</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    >
                      <option value="active">Actif (Formateur Titulaire)</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">Biographie / Remarques</label>
                  <textarea
                    placeholder="Parcours ou remarques..."
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    rows={2}
                    className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-[#F0F0EE]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-[#8E9299] hover:text-[#1A1A1A]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-900 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-xs font-medium shadow-md"
                  >
                    {editingTeacher ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teacher Card Modal */}
      <TeacherCardModal
        isOpen={isCardModalOpen}
        onClose={() => { setIsCardModalOpen(false); setSelectedCardTeacher(null); }}
        teacher={selectedCardTeacher}
        centerName="kalan gest KG"
      />
    </div>
  );
};
