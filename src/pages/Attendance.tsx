import React, { useEffect, useState } from 'react';
import { 
  CalendarCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle, 
  Save, 
  UserCheck, 
  TrendingUp, 
  Users,
  Printer,
  FileSpreadsheet,
  CheckSquare,
  XSquare
} from 'lucide-react';
import { attendancesApi, coursesApi, enrollmentsApi, studentsApi } from '../lib/api';
import { Attendance as AttendanceRecord, AttendanceStatus, Course, Enrollment, Student } from '../types';
import { SearchableSelect } from '../components/SearchableSelect';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { exportAttendancePDF } from '../lib/pdfExport';
import { exportToCSV } from '../lib/excelExport';

export const Attendance: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  // Local state for temporary attendance entries before saving
  const [attendanceState, setAttendanceState] = useState<{ [studentId: string]: AttendanceStatus }>({});
  const [noteState, setNoteState] = useState<{ [studentId: string]: string }>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stData, crData, enData, atData] = await Promise.all([
        studentsApi.list(),
        coursesApi.list(),
        enrollmentsApi.list(),
        attendancesApi.list()
      ]);

      setStudents(stData || []);
      setCourses(crData || []);
      setEnrollments(enData || []);
      setAttendances(atData || []);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync current attendance state when course or date changes
  useEffect(() => {
    const initialState: { [studentId: string]: AttendanceStatus } = {};
    const initialNotes: { [studentId: string]: string } = {};

    attendances.forEach(att => {
      if (att.date === selectedDate && (selectedCourseId === 'all' || att.courseId === selectedCourseId)) {
        initialState[att.studentId] = att.status;
        initialNotes[att.studentId] = att.notes || '';
      }
    });

    setAttendanceState(initialState);
    setNoteState(initialNotes);
  }, [selectedCourseId, selectedDate, attendances]);

  // Filter students relevant to selected course
  const enrolledStudentIds = selectedCourseId === 'all' 
    ? Array.from(new Set(enrollments.map(e => e.studentId)))
    : enrollments.filter(e => e.courseId === selectedCourseId).map(e => e.studentId);

  const filteredStudents = students.filter(st => {
    const matchesCourse = selectedCourseId === 'all' || enrolledStudentIds.includes(st.id);
    const matchesSearch = `${st.firstName} ${st.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState(prev => ({ ...prev, [studentId]: status }));
  };

  const handleBulkSetStatus = (status: AttendanceStatus) => {
    const nextState = { ...attendanceState };
    filteredStudents.forEach(st => {
      nextState[st.id] = status;
    });
    setAttendanceState(nextState);
    toast.info(`Tous les élèves filtrés marqués "${status === 'present' ? 'Présents' : status === 'absent' ? 'Absents' : status}"`);
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setNoteState(prev => ({ ...prev, [studentId]: note }));
  };

  const handleExportPDF = () => {
    const course = courses.find(c => c.id === selectedCourseId) || { name: 'Tous les cours', price: 0 };
    const records = filteredStudents.map(st => ({
      studentId: st.id,
      date: selectedDate,
      status: attendanceState[st.id] || 'present',
      notes: noteState[st.id] || ''
    }));

    exportAttendancePDF({
      course,
      date: selectedDate,
      students: filteredStudents as any,
      records
    });
    toast.success('Fiche de présence générée au format PDF');
  };

  const handleExportCSV = () => {
    const headers = ['#', 'Date', 'Élève', 'Téléphone', 'Statut', 'Notes / Motif'];
    const rows = filteredStudents.map((st, index) => [
      index + 1,
      selectedDate,
      `${st.firstName} ${st.lastName}`,
      st.phoneNumber || '',
      attendanceState[st.id] || 'present',
      noteState[st.id] || ''
    ]);

    exportToCSV(`presence_${selectedDate}`, headers, rows);
    toast.success('Feuille de présence exportée en CSV / Excel');
  };

  const handleSaveAttendance = async () => {
    if (selectedCourseId === 'all') {
      toast.error('Veuillez sélectionner un cours spécifique pour enregistrer les présences.');
      return;
    }

    setSaving(true);
    try {
      const savePromises = Object.entries(attendanceState).map(async ([studentId, status]) => {
        const existing = attendances.find(
          a => a.studentId === studentId && a.courseId === selectedCourseId && a.date === selectedDate
        );

        const payload = {
          studentId,
          courseId: selectedCourseId,
          date: selectedDate,
          status,
          notes: noteState[studentId] || ''
        };

        if (existing) {
          return attendancesApi.update(existing.id, payload);
        } else {
          return attendancesApi.create(payload);
        }
      });

      await Promise.all(savePromises);
      toast.success('Appel enregistré avec succès');
      await fetchData();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de la sauvegarde des présences');
    } finally {
      setSaving(false);
    }
  };

  // Overall Statistics
  const totalRecords = attendances.length;
  const presentCount = attendances.filter(a => a.status === 'present').length;
  const absentCount = attendances.filter(a => a.status === 'absent').length;
  const lateCount = attendances.filter(a => a.status === 'late').length;
  const presenceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E0] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">Taux de Présence Global</p>
            <h3 className="text-2xl font-serif font-bold text-emerald-900 mt-1">{presenceRate}%</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E0] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">Présences Enregistrées</p>
            <h3 className="text-2xl font-serif font-bold text-emerald-700 mt-1">{presentCount}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E0] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">Absences Totales</p>
            <h3 className="text-2xl font-serif font-bold text-red-600 mt-1">{absentCount}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
            <XCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E0] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">Retards</p>
            <h3 className="text-2xl font-serif font-bold text-amber-600 mt-1">{lateCount}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E0] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Course Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
              Sélectionner le Cours
            </label>
            <SearchableSelect
              value={selectedCourseId}
              onChange={val => setSelectedCourseId(val)}
              placeholder="Tous les cours (Vue d'ensemble)"
              options={[
                { value: "all", label: "Tous les cours (Vue d'ensemble)" },
                ...courses.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>

          {/* Date Selector */}
          <div className="min-w-[160px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
              Date de l'Appel
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
            />
          </div>

          {/* Search Bar */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-1">
              Rechercher un Élève
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9299]" size={16} />
              <input
                type="text"
                placeholder="Nom ou prénom..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-end">
          <button
            onClick={handleSaveAttendance}
            disabled={saving || selectedCourseId === 'all'}
            className="w-full md:w-auto bg-emerald-900 hover:bg-emerald-800 text-white px-6 py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={16} />
                Enregistrer la Feuille d'Appel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="bg-white rounded-2xl border border-[#E5E5E0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F0F0EE] bg-[#F9F9F7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="text-emerald-900" size={18} />
            <h3 className="font-serif font-bold text-sm text-[#1A1A1A]">
              Feuille d'Appel {selectedCourseId !== 'all' ? `- ${courses.find(c => c.id === selectedCourseId)?.name}` : ''} ({new Date(selectedDate).toLocaleDateString('fr-FR')})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleBulkSetStatus('present')}
              className="px-2.5 py-1.5 bg-emerald-100/70 hover:bg-emerald-200/80 text-emerald-900 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1"
              title="Cocher Présent pour tous les élèves ci-dessous"
            >
              <CheckSquare size={13} /> Tout Présent
            </button>

            <button
              onClick={() => handleBulkSetStatus('absent')}
              className="px-2.5 py-1.5 bg-red-100/70 hover:bg-red-200/80 text-red-900 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1"
              title="Cocher Absent pour tous les élèves ci-dessous"
            >
              <XSquare size={13} /> Tout Absent
            </button>

            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-white border border-[#E5E5E0] hover:bg-[#F0F0EE] text-[#1A1A1A] rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1"
              title="Exporter cette feuille en fichier CSV / Excel"
            >
              <FileSpreadsheet size={13} className="text-emerald-700" /> Excel
            </button>

            <button
              onClick={handleExportPDF}
              className="px-2.5 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1"
              title="Imprimer ou télécharger la fiche au format PDF"
            >
              <Printer size={13} /> Imprimer PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-emerald-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-[#8E9299]">Chargement de la feuille de présence...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-[#8E9299]">
            <Users size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">Aucun élève trouvé pour cette sélection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-[#E5E5E0] text-[10px] uppercase tracking-wider text-[#8E9299]">
                <tr>
                  <th className="p-4">Élève</th>
                  <th className="p-4 text-center">Présent</th>
                  <th className="p-4 text-center">Absent</th>
                  <th className="p-4 text-center">Retard</th>
                  <th className="p-4 text-center">Excusé</th>
                  <th className="p-4">Remarque / Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EE]">
                {filteredStudents.map(st => {
                  const currentStatus = attendanceState[st.id] || 'present';
                  return (
                    <tr key={st.id} className="hover:bg-[#F9F9F7] transition-colors">
                      <td className="p-4 font-medium text-[#1A1A1A]">
                        <div>
                          <p className="font-bold">{st.firstName} {st.lastName}</p>
                          <p className="text-[10px] text-[#8E9299]">{st.email || st.phoneNumber || 'Sans contact'}</p>
                        </div>
                      </td>

                      {/* Present Option */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'present')}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-1 mx-auto ${
                            currentStatus === 'present'
                              ? 'bg-emerald-900 text-white shadow-sm'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle2 size={14} /> Présent
                        </button>
                      </td>

                      {/* Absent Option */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'absent')}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-1 mx-auto ${
                            currentStatus === 'absent'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          <XCircle size={14} /> Absent
                        </button>
                      </td>

                      {/* Late Option */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'late')}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-1 mx-auto ${
                            currentStatus === 'late'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          <Clock size={14} /> Retard
                        </button>
                      </td>

                      {/* Excused Option */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'excused')}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-1 mx-auto ${
                            currentStatus === 'excused'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <HelpCircle size={14} /> Excusé
                        </button>
                      </td>

                      {/* Note Input */}
                      <td className="p-4">
                        <input
                          type="text"
                          placeholder="Note explicative..."
                          value={noteState[st.id] || ''}
                          onChange={e => handleNoteChange(st.id, e.target.value)}
                          className="w-full bg-[#F9F9F7] border border-[#E5E5E0] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-emerald-900"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
