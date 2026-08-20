import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BookOpen, GraduationCap, Wallet, TrendingUp, Calendar, Download,
  Plus, CreditCard, UserPlus, CalendarCheck, Award, Smartphone, AlertTriangle,
  ArrowRight, FileSpreadsheet, ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../lib/api';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [centerName, setCenterName] = useState('kalan gest KG');
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    registrations: 0,
    totalPayments: 0,
    debtorsCount: 0,
    totalDebts: 0,
    recentPayments: [] as any[],
    debtorStudents: [] as any[]
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [general, students, courses, enrollments, payments] = await Promise.all([
          apiFetch('/api/settings/general', { showToast: false }),
          apiFetch('/api/students', { showToast: false }),
          apiFetch('/api/courses', { showToast: false }),
          apiFetch('/api/enrollments', { showToast: false }),
          apiFetch('/api/payments', { showToast: false })
        ]);

        if (general) {
          setCenterName(general.centerName || 'kalan gest KG');
        }

        const safeStudents = Array.isArray(students) ? students : [];
        const safeCourses = Array.isArray(courses) ? courses : [];
        const safeEnrollments = Array.isArray(enrollments) ? enrollments : [];
        const safePayments = Array.isArray(payments) ? payments : [];

        const totalPayments = safePayments.reduce((acc: number, p: any) => acc + (p?.amount || 0), 0);

        // Calculate student balances and debtors
        const debtors: any[] = [];
        let totalDebtsSum = 0;

        safeStudents.forEach((st: any) => {
          const stRegs = safeEnrollments.filter((r: any) => r.studentId === st.id);
          const totalFees = stRegs.reduce((acc: number, reg: any) => {
            const course = safeCourses.find((c: any) => c.id === reg.courseId);
            return acc + (course?.price || 0);
          }, 0);

          const paidSum = safePayments
            .filter((p: any) => p.studentId === st.id)
            .reduce((acc: number, p: any) => acc + (p?.amount || 0), 0);

          const balance = totalFees - paidSum;
          if (balance > 0) {
            debtors.push({ ...st, balance });
            totalDebtsSum += balance;
          }
        });

        // Recent payments with student names
        const recent = [...safePayments]
          .sort((a, b) => new Date(b?.createdAt || b?.paymentDate || 0).getTime() - new Date(a?.createdAt || a?.paymentDate || 0).getTime())
          .slice(0, 5)
          .map((p: any) => {
            const student = safeStudents.find((s: any) => s.id === p.studentId);
            return {
              ...p,
              studentName: student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu'
            };
          });

        setStats({
          students: safeStudents.length,
          courses: safeCourses.length,
          registrations: safeEnrollments.length,
          totalPayments,
          debtorsCount: debtors.length,
          totalDebts: totalDebtsSum,
          recentPayments: recent,
          debtorStudents: debtors.slice(0, 4)
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { label: 'Élèves Inscrits', value: stats.students, icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-100', trend: 'Base élèves' },
    { label: 'Formations Actives', value: stats.courses, icon: BookOpen, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', trend: 'Programmes' },
    { label: 'Recettes Totales', value: `${stats.totalPayments.toLocaleString('fr-FR')} FCFA`, icon: Wallet, color: 'bg-emerald-900 text-white border-emerald-800', trend: 'Encaissé' },
    { label: 'Reste à Recouvrer', value: `${stats.totalDebts.toLocaleString('fr-FR')} FCFA`, icon: AlertTriangle, color: 'bg-rose-50 text-rose-700 border-rose-100', trend: `${stats.debtorsCount} impayé(s)` },
  ];

  const handleExportExcel = async () => {
    try {
      const [studentsData, coursesData, paymentsData] = await Promise.all([
        apiFetch('/api/students'),
        apiFetch('/api/courses'),
        apiFetch('/api/payments')
      ]);

      const safeStudentsData = Array.isArray(studentsData) ? studentsData : [];
      const safeCoursesData = Array.isArray(coursesData) ? coursesData : [];
      const safePaymentsData = Array.isArray(paymentsData) ? paymentsData : [];

      const students = safeStudentsData.map((data: any) => ({
        ID: data.id,
        Prenom: data.firstName,
        Nom: data.lastName,
        Email: data.email || '',
        Telephone: data.phoneNumber || '',
        Date_Inscription: data.registrationDate || '',
        Statut: data.status === 'active' ? 'Actif' : 'Inactif'
      }));

      const courses = safeCoursesData.map((data: any) => ({
        ID: data.id,
        Formation: data.name,
        Formateur: data.teacher || '',
        Prix_FCFA: data.price,
        Horaires: data.schedule || ''
      }));

      const payments = safePaymentsData.map((data: any) => {
        const student = safeStudentsData.find((s: any) => s.id === data.studentId);
        return {
          ID: data.id,
          Eleve: student ? `${student.firstName} ${student.lastName}` : data.studentId,
          Montant_FCFA: data.amount,
          Date: data.paymentDate,
          Methode: data.paymentMethod,
          Ref: data.referenceNumber || ''
        };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students), "Eleves");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(courses), "Formations");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), "Paiements");

      const fileName = centerName.toLowerCase().replace(/\s+/g, '_');
      XLSX.writeFile(wb, `${fileName}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Excel Export failed:", error);
      alert("Erreur lors de l'export Excel.");
    }
  };

  const openWhatsApp = (phoneNumber: string, name: string, balance: number) => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    const msg = `Bonjour ${name}, nous vous rappelons qu'un solde de ${balance.toLocaleString('fr-FR')} FCFA reste à régler pour votre formation au ${centerName}. Merci de bien vouloir nous contacter.`;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-8 text-left">
      
      {/* Quick Actions Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E5E0] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0F0EE] pb-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">Centre {centerName}</h2>
            <p className="text-xs text-[#8E9299]">Tableau de bord de gestion pédagogique & comptable</p>
          </div>
          <button 
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-900 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-all shadow-sm shrink-0"
          >
            <FileSpreadsheet size={16} />
            Exporter Excel / CSV
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/payments')}
            className="flex items-center gap-3 p-3 bg-emerald-50/80 border border-emerald-100 hover:bg-emerald-100 rounded-2xl transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950 group-hover:text-emerald-800">Nouveau Paiement</p>
              <p className="text-[10px] text-[#8E9299]">Saisie & Reçu PDF</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-3 p-3 bg-[#F9F9F7] border border-[#E5E5E0] hover:bg-white rounded-2xl transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
              <UserPlus size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A]">Inscrire un Élève</p>
              <p className="text-[10px] text-[#8E9299]">Nouveau profil</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/attendance')}
            className="flex items-center gap-3 p-3 bg-[#F9F9F7] border border-[#E5E5E0] hover:bg-white rounded-2xl transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0">
              <CalendarCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A]">Faire l'Appel</p>
              <p className="text-[10px] text-[#8E9299]">Suivi des présences</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/grades')}
            className="flex items-center gap-3 p-3 bg-[#F9F9F7] border border-[#E5E5E0] hover:bg-white rounded-2xl transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
              <Award size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A]">Saisir Notes</p>
              <p className="text-[10px] text-[#8E9299]">Bulletins & Certificats</p>
            </div>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`p-6 rounded-3xl border shadow-sm ${
              card.label === 'Recettes Totales' 
                ? 'bg-emerald-900 text-white border-emerald-800' 
                : 'bg-white border-[#E5E5E0]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${card.color}`}>
                <card.icon size={22} />
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                card.label === 'Recettes Totales' ? 'bg-emerald-800 text-emerald-200' : 'bg-[#F5F5F0] text-[#8E9299]'
              }`}>
                {card.trend}
              </span>
            </div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
              card.label === 'Recettes Totales' ? 'text-emerald-300' : 'text-[#8E9299]'
            }`}>
              {card.label}
            </p>
            <h3 className="text-2xl font-bold font-serif">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Payments Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E5E5E0] overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-5 border-b border-[#F0F0EE] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-700" />
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">Derniers Encaissements</h3>
            </div>
            <button 
              onClick={() => navigate('/payments')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              <span>Gérer les paiements</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F9F9F7] text-[#8E9299] text-[10px] uppercase tracking-wider border-b border-[#E5E5E0]">
                  <th className="px-6 py-3.5 font-bold">Élève</th>
                  <th className="px-6 py-3.5 font-bold">Montant</th>
                  <th className="px-6 py-3.5 font-bold">Date</th>
                  <th className="px-6 py-3.5 font-bold">Méthode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EE] text-xs">
                {stats.recentPayments.length > 0 ? stats.recentPayments.map((p, idx) => (
                  <tr key={`${p.id}-${idx}`} className="hover:bg-[#F9F9F7] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1A1A1A]">
                      {p.studentName}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-800">
                      {p.amount.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-6 py-4 text-[#8E9299]">
                      {p.paymentDate || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                        {p.paymentMethod === 'cash' ? 'Espèces' : p.paymentMethod === 'wave' ? 'Wave' : p.paymentMethod === 'orange_money' ? 'Orange Money' : 'Virement'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-[#8E9299] text-xs italic">
                      Aucun paiement enregistré pour l'instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Debtors & Alerts Column */}
        <div className="space-y-6">
          
          {/* Overdue Payments Alert Box */}
          <div className="bg-white p-6 rounded-3xl border border-[#E5E5E0] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F0EE] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <AlertTriangle size={16} />
                </div>
                <h3 className="font-serif text-sm font-bold text-[#1A1A1A]">Relances Impayés</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">
                {stats.debtorsCount} élève(s)
              </span>
            </div>

            <div className="space-y-2.5">
              {stats.debtorStudents.length > 0 ? stats.debtorStudents.map((st, idx) => (
                <div key={`${st.id}-${idx}`} className="p-3 bg-[#F9F9F7] rounded-2xl border border-[#E5E5E0] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1A1A1A] truncate">{st.firstName} {st.lastName}</p>
                    <p className="text-[10px] text-rose-600 font-bold">Reste: {st.balance.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  {st.phoneNumber && (
                    <button
                      onClick={() => openWhatsApp(st.phoneNumber, `${st.firstName} ${st.lastName}`, st.balance)}
                      className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-1 text-[10px] font-bold"
                      title="Relancer par WhatsApp"
                    >
                      <Smartphone size={14} />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  )}
                </div>
              )) : (
                <div className="p-6 text-center text-emerald-800 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs font-medium">
                  <ShieldCheck size={20} className="mx-auto mb-1 text-emerald-700" />
                  Tous les paiements sont à jour !
                </div>
              )}
            </div>

            {stats.debtorsCount > 0 && (
              <button 
                onClick={() => navigate('/payments?tab=reminders')}
                className="w-full py-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all text-center"
              >
                Voir toutes les relances ({stats.debtorsCount})
              </button>
            )}
          </div>

          {/* Center Info Card */}
          <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 text-white p-6 rounded-3xl shadow-md space-y-3">
            <h4 className="font-serif text-base font-bold text-white">Gestion Administrative</h4>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              Consultez le guide utilisateur pour former les secrétaires et formateurs aux procédures du centre.
            </p>
            <button
              onClick={() => {
                const btn = document.querySelector('button[title="Guide d\'utilisation"]') as HTMLElement;
                if (btn) btn.click();
              }}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all text-center"
            >
              Ouvrir le Mode d'Emploi
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

