import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useFirestore } from '../lib/hooks/useFirestore';
import { apiFetch } from '../lib/api';
import { Payment, Student, Course, PaymentMethod } from '../types';
import { 
  Search, Plus, User, Trash2, Download, ReceiptText, DollarSign, 
  Bell, History, Phone, Send, CheckCircle2, CreditCard, Filter, 
  Calendar, Sparkles, Smartphone, Check, ArrowRight, ShieldCheck, RefreshCw,
  TrendingUp, TrendingDown, BarChart3, PieChart, Award, ArrowUpRight, ArrowDownRight,
  AlertTriangle, AlertCircle, Clock, Siren, Flame, FileSpreadsheet, X, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Invoice } from '../components/Invoice';
import { exportPaymentsPDF } from '../lib/pdfExport';
import { exportToCSV } from '../lib/excelExport';
import { SearchableSelect } from '../components/SearchableSelect';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

export const Payments: React.FC = () => {
  const { list: listPayments, add: addPayment, remove: removePayment } = useFirestore<Payment>('payments');
  const { list: listStudents } = useFirestore<Student>('students');
  
  const [payments, setPayments] = useState<(Payment & { id: string })[]>([]);
  const [students, setStudents] = useState<(Student & { id: string })[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Modals & previews
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<(Payment & { id: string }) | null>(null);
  const [previewPayment, setPreviewPayment] = useState<(Payment & { id: string }) | null>(null);
  
  // Navigation & Filters
  const [activeTab, setActiveTab] = useState<'history' | 'reminders'>('history');
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'month'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [delayFilter, setDelayFilter] = useState<'all' | 'critical' | 'moderate' | 'recent'>('all');

  // Dashboard Chart Controls
  const [chartTimeRange, setChartTimeRange] = useState<'6' | '12'>('6');
  const [showChartDetails, setShowChartDetails] = useState(false);
  
  // WhatsApp Reminder Modal state
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedReminderStudent, setSelectedReminderStudent] = useState<Student | null>(null);
  const [reminderTargetPhone, setReminderTargetPhone] = useState('');
  const [reminderCustomMessage, setReminderCustomMessage] = useState('');

  const [centerSettings, setCenterSettings] = useState({ name: 'kalan gest KG', logo: '' });
  const [error, setError] = useState<string | null>(null);

  // Modal Student Lookup
  const [studentSearchInModal, setStudentSearchInModal] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as PaymentMethod,
    referenceNumber: '',
    description: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [pData, sData, regData, courseData, generalSettings] = await Promise.all([
        listPayments(), 
        listStudents(),
        apiFetch('/api/enrollments', { showToast: false }),
        apiFetch('/api/courses', { showToast: false }),
        apiFetch('/api/settings/general', { showToast: false })
      ]);
      
      setPayments(Array.isArray(pData) ? pData : []);
      setStudents(Array.isArray(sData) ? sData : []);
      setRegistrations(Array.isArray(regData) ? regData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
      
      if (generalSettings) {
        setCenterSettings({
          name: generalSettings.centerName || 'kalan gest KG',
          logo: generalSettings.logoUrl || ''
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }, [listPayments, listStudents]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStudentBalance = useCallback((studentId: string, courseId?: string) => {
    const safeRegs = Array.isArray(registrations) ? registrations : [];
    const safePayments = Array.isArray(payments) ? payments : [];
    const safeCourses = Array.isArray(courses) ? courses : [];

    const studentRegs = safeRegs.filter(r => r && r.studentId === studentId && (!courseId || r.courseId === courseId));
    const totalFees = studentRegs.reduce((acc, reg) => {
      const course = safeCourses.find(c => c && c.id === reg.courseId);
      return acc + (course?.price || 0);
    }, 0);
    
    const totalPaid = safePayments
      .filter(p => p && p.studentId === studentId && (!courseId || p.courseId === courseId))
      .reduce((acc, p) => acc + (p.amount || 0), 0);
      
    return totalFees - totalPaid;
  }, [registrations, payments, courses]);

  const getStudentTotalFee = useCallback((studentId: string, courseId?: string) => {
    const safeRegs = Array.isArray(registrations) ? registrations : [];
    const safeCourses = Array.isArray(courses) ? courses : [];

    const studentRegs = safeRegs.filter(r => r && r.studentId === studentId && (!courseId || r.courseId === courseId));
    return studentRegs.reduce((acc, reg) => {
      const course = safeCourses.find(c => c && c.id === reg.courseId);
      return acc + (course?.price || 0);
    }, 0);
  }, [registrations, courses]);

  const getStudentTotalPaid = useCallback((studentId: string, courseId?: string) => {
    const safePayments = Array.isArray(payments) ? payments : [];
    return safePayments
      .filter(p => p && p.studentId === studentId && (!courseId || p.courseId === courseId))
      .reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [payments]);

  // Calculate days elapsed since registration date (or earliest enrollment)
  const getDaysSinceRegistration = useCallback((student: Student) => {
    const safeRegs = Array.isArray(registrations) ? registrations : [];
    const studentRegs = safeRegs.filter(r => r && r.studentId === student.id);
    let regDateStr = student.registrationDate || student.createdAt;
    
    if (studentRegs.length > 0) {
      const dates = studentRegs
        .map(r => r.startDate || r.createdAt)
        .filter(Boolean)
        .sort();
      if (dates.length > 0) {
        regDateStr = dates[0];
      }
    }

    if (!regDateStr) return 0;

    const regDate = new Date(regDateStr);
    if (isNaN(regDate.getTime())) return 0;

    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - regDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [registrations]);

  // Formatted registration date
  const getStudentRegistrationDate = useCallback((student: Student) => {
    const safeRegs = Array.isArray(registrations) ? registrations : [];
    const studentRegs = safeRegs.filter(r => r && r.studentId === student.id);
    let regDateStr = student.registrationDate || student.createdAt;
    
    if (studentRegs.length > 0) {
      const dates = studentRegs
        .map(r => r.startDate || r.createdAt)
        .filter(Boolean)
        .sort();
      if (dates.length > 0) {
        regDateStr = dates[0];
      }
    }

    if (!regDateStr) return 'N/A';
    
    const d = new Date(regDateStr);
    if (isNaN(d.getTime())) return String(regDateStr).split('T')[0];
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }, [registrations]);

  // Alert Severity Level & Styling
  const getOverdueInfo = useCallback((student: Student) => {
    const balance = getStudentBalance(student.id);
    if (balance <= 0) {
      return { 
        level: 'paid', 
        label: 'À jour', 
        days: 0, 
        badgeBg: 'bg-emerald-50', 
        badgeText: 'text-emerald-700', 
        badgeBorder: 'border-emerald-200/80',
        rowClass: ''
      };
    }

    const days = getDaysSinceRegistration(student);

    if (days >= 30) {
      return {
        level: 'critical',
        label: `Retard Critique (+${days}j)`,
        days,
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-800',
        badgeBorder: 'border-red-300/80',
        rowClass: 'bg-red-50/50 hover:bg-red-100/50 border-l-4 border-l-red-500'
      };
    } else if (days >= 15) {
      return {
        level: 'moderate',
        label: `Retard Modéré (${days}j)`,
        days,
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-300/80',
        rowClass: 'bg-amber-50/40 hover:bg-amber-100/40 border-l-4 border-l-amber-500'
      };
    } else {
      return {
        level: 'recent',
        label: `En cours (${days}j)`,
        days,
        badgeBg: 'bg-blue-50',
        badgeText: 'text-blue-700',
        badgeBorder: 'border-blue-200/80',
        rowClass: 'hover:bg-rose-50/20'
      };
    }
  }, [getStudentBalance, getDaysSinceRegistration]);

  // Open modal with pre-selected student
  const openPaymentForStudent = (studentId: string, courseId?: string) => {
    setError(null);
    setStudentSearchInModal('');
    const balance = getStudentBalance(studentId, courseId);
    
    setFormData({
      studentId,
      courseId: courseId || '',
      amount: Math.max(0, balance),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      referenceNumber: '',
      description: courseId 
        ? `Règlement formation ${getCourseName(courseId)}` 
        : 'Règlement du solde de formation'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.studentId) {
      setError("Veuillez sélectionner un élève.");
      return;
    }

    if (formData.amount <= 0) {
      setError("Le montant doit être supérieur à 0 FCFA.");
      return;
    }

    const balance = getStudentBalance(formData.studentId, formData.courseId);
    if (balance > 0 && formData.amount > balance) {
      setError(`Le montant saisi (${formData.amount.toLocaleString()} FCFA) dépasse le solde restant dû (${balance.toLocaleString()} FCFA).`);
      return;
    }

    try {
      const newPayment = await addPayment(formData);
      setIsModalOpen(false);
      
      toast.success('Paiement enregistré avec succès !', {
        action: newPayment?.id ? {
          label: 'Imprimer reçu',
          onClick: () => {
            setPreviewPayment({
              ...formData,
              id: newPayment.id,
              createdAt: new Date().toISOString()
            } as any);
            setIsInvoicePreviewOpen(true);
          }
        } : undefined
      });

      setFormData({ 
        studentId: '', 
        courseId: '',
        amount: 0, 
        paymentDate: new Date().toISOString().split('T')[0], 
        paymentMethod: 'cash', 
        referenceNumber: '',
        description: '' 
      });
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'enregistrement du paiement.");
    }
  };

  const getCourseName = (id?: string) => {
    if (!id) return '';
    const safeCourses = Array.isArray(courses) ? courses : [];
    const course = safeCourses.find(c => c && c.id === id);
    return course?.name || '';
  };

  const getStudentName = (id: string) => {
    const safeStudents = Array.isArray(students) ? students : [];
    const student = safeStudents.find(s => s && s.id === id);
    return student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu';
  };

  const getMethodBadge = (method: PaymentMethod | string) => {
    switch (method) {
      case 'wave':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200/60 text-[10px] font-bold uppercase"><Smartphone size={12} /> Wave</span>;
      case 'orange_money':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200/60 text-[10px] font-bold uppercase"><Smartphone size={12} /> Orange Money</span>;
      case 'transfer':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-[10px] font-bold uppercase"><CreditCard size={12} /> Virement</span>;
      case 'check':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px] font-bold uppercase"><CreditCard size={12} /> Chèque</span>;
      case 'cash':
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-bold uppercase"><DollarSign size={12} /> Espèces</span>;
    }
  };

  // Filter Payments
  const safePayments = useMemo(() => Array.isArray(payments) ? payments : [], [payments]);
  const safeStudents = useMemo(() => Array.isArray(students) ? students : [], [students]);

  const filteredPayments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = new Date().toISOString().substring(0, 7);

    return safePayments.filter(p => {
      const sName = getStudentName(p.studentId).toLowerCase();
      const ref = (p.referenceNumber || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch = sName.includes(q) || ref.includes(q) || desc.includes(q);
      const matchesCourse = courseFilter === '' || p.courseId === courseFilter;
      const matchesMethod = methodFilter === '' || p.paymentMethod === methodFilter;

      let matchesPeriod = true;
      if (periodFilter === 'today') {
        matchesPeriod = p.paymentDate === todayStr;
      } else if (periodFilter === 'month') {
        matchesPeriod = p.paymentDate.startsWith(currentMonthStr);
      }

      return matchesSearch && matchesCourse && matchesMethod && matchesPeriod;
    });
  }, [safePayments, search, courseFilter, methodFilter, periodFilter, students]);

  // Monthly Revenue Line Chart Data
  const monthlyRevenueData = useMemo(() => {
    const rangeCount = chartTimeRange === '12' ? 12 : 6;
    const now = new Date();
    const monthsMap = new Map<string, { key: string; label: string; revenue: number; count: number }>();

    for (let i = rangeCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${monthNum}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      monthsMap.set(key, { key, label: capitalizedLabel, revenue: 0, count: 0 });
    }

    safePayments.forEach(p => {
      if (!p.amount) return;
      const dateStr = p.paymentDate || p.createdAt;
      if (!dateStr) return;
      
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const key = `${parts[0]}-${parts[1]}`;
        if (monthsMap.has(key)) {
          const item = monthsMap.get(key)!;
          item.revenue += p.amount;
          item.count += 1;
        }
      }
    });

    return Array.from(monthsMap.values());
  }, [safePayments, chartTimeRange]);

  // Chart Metrics
  const chartMetrics = useMemo(() => {
    const totalPeriod = monthlyRevenueData.reduce((acc, m) => acc + m.revenue, 0);
    const avgMonthly = monthlyRevenueData.length > 0 ? Math.round(totalPeriod / monthlyRevenueData.length) : 0;
    
    let bestMonth = monthlyRevenueData[0] || null;
    monthlyRevenueData.forEach(m => {
      if (!bestMonth || m.revenue > bestMonth.revenue) {
        bestMonth = m;
      }
    });

    const currentMonthData = monthlyRevenueData[monthlyRevenueData.length - 1];
    const prevMonthData = monthlyRevenueData[monthlyRevenueData.length - 2];

    let growth = 0;
    if (prevMonthData && prevMonthData.revenue > 0) {
      growth = Math.round(((currentMonthData.revenue - prevMonthData.revenue) / prevMonthData.revenue) * 100);
    } else if (currentMonthData && currentMonthData.revenue > 0) {
      growth = 100;
    }

    return {
      totalPeriod,
      avgMonthly,
      bestMonth: bestMonth && bestMonth.revenue > 0 ? bestMonth : null,
      growth
    };
  }, [monthlyRevenueData]);

  // Payment Method Breakdown for details panel
  const methodBreakdown = useMemo(() => {
    const breakdown = { cash: 0, wave: 0, orange: 0, transfer: 0, check: 0 };
    safePayments.forEach(p => {
      const amt = p.amount || 0;
      switch (p.paymentMethod) {
        case 'wave': breakdown.wave += amt; break;
        case 'orange_money': breakdown.orange += amt; break;
        case 'transfer': breakdown.transfer += amt; break;
        case 'check': breakdown.check += amt; break;
        case 'cash':
        default: breakdown.cash += amt; break;
      }
    });
    return breakdown;
  }, [safePayments]);

  // Reminders List
  const filteredReminders = useMemo(() => {
    return safeStudents.filter(s => {
      const balance = getStudentBalance(s.id);
      if (balance <= 0) return false;

      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const phone = (s.phoneNumber || '').toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch = fullName.includes(q) || phone.includes(q);
      
      let matchesCourse = true;
      if (courseFilter !== '') {
        const courseBalance = getStudentBalance(s.id, courseFilter);
        matchesCourse = courseBalance > 0;
      }

      let matchesDelay = true;
      const days = getDaysSinceRegistration(s);
      if (delayFilter === 'critical') {
        matchesDelay = days >= 30;
      } else if (delayFilter === 'moderate') {
        matchesDelay = days >= 15 && days < 30;
      } else if (delayFilter === 'recent') {
        matchesDelay = days < 15;
      }

      return matchesSearch && matchesCourse && matchesDelay;
    });
  }, [safeStudents, search, courseFilter, delayFilter, getStudentBalance, getDaysSinceRegistration]);

  // Overdue stats summary
  const overdueStats = useMemo(() => {
    let criticalCount = 0;
    let criticalAmount = 0;
    let moderateCount = 0;
    let moderateAmount = 0;
    let recentCount = 0;

    safeStudents.forEach(s => {
      const balance = getStudentBalance(s.id);
      if (balance > 0) {
        const days = getDaysSinceRegistration(s);
        if (days >= 30) {
          criticalCount++;
          criticalAmount += balance;
        } else if (days >= 15) {
          moderateCount++;
          moderateAmount += balance;
        } else {
          recentCount++;
        }
      }
    });

    return { criticalCount, criticalAmount, moderateCount, moderateAmount, recentCount };
  }, [safeStudents, getStudentBalance, getDaysSinceRegistration]);

  // Global KPIs
  const totalEncaisseTotal = useMemo(() => {
    return safePayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [safePayments]);

  const totalEncaisseFiltered = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [filteredPayments]);

  const totalImpayes = useMemo(() => {
    return safeStudents.reduce((acc, s) => acc + Math.max(0, getStudentBalance(s.id)), 0);
  }, [safeStudents, getStudentBalance]);

  const recoveryRate = useMemo(() => {
    const totalExpected = totalEncaisseTotal + totalImpayes;
    if (totalExpected === 0) return 100;
    return Math.round((totalEncaisseTotal / totalExpected) * 100);
  }, [totalEncaisseTotal, totalImpayes]);

  const handleDelete = (payment: Payment & { id: string }) => {
    setPaymentToDelete(payment);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (paymentToDelete) {
      await removePayment(paymentToDelete.id);
      toast.success('Paiement supprimé');
      setIsDeleteModalOpen(false);
      setPaymentToDelete(null);
      fetchData();
    }
  };

  const handleExportPaymentsPDF = () => {
    try {
      exportPaymentsPDF({
        payments: filteredPayments,
        students,
        courses,
        registrations,
        courseFilterId: courseFilter,
        searchQuery: search,
        activeTab,
        centerInfo: {
          name: centerSettings.name
        }
      });
      toast.success(
        activeTab === 'history'
          ? 'Rapport des encaissements exporté en PDF'
          : 'Rapport des rappels et impayés exporté en PDF'
      );
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la génération du rapport PDF');
    }
  };

  const handleExportPaymentsExcel = () => {
    try {
      if (activeTab === 'history') {
        const headers = [
          'N°',
          'Référence / N° Reçu',
          'Date du Versement',
          'Élève',
          'Téléphone',
          'Formation',
          'Montant (FCFA)',
          'Mode de Règlement',
          'Réf. Transaction / Chèque',
          'Notes / Remarques'
        ];
        const rows = filteredPayments.map((p, index) => {
          const student = safeStudents.find(s => s.id === p.studentId);
          const course = courses.find(c => c.id === p.courseId);
          const methodLabel = p.paymentMethod === 'cash' ? 'Espèces'
            : p.paymentMethod === 'wave' ? 'Wave'
            : p.paymentMethod === 'orange_money' ? 'Orange Money'
            : p.paymentMethod === 'bank_transfer' ? 'Virement Bancaire'
            : p.paymentMethod === 'check' ? 'Chèque'
            : p.paymentMethod || 'Espèces';

          return [
            index + 1,
            p.referenceNumber || `REC-${p.id?.substring(0, 6)}`,
            p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('fr-FR') : '',
            student ? `${student.firstName} ${student.lastName}` : getStudentName(p.studentId),
            student?.phoneNumber || '',
            course?.name || getCourseName(p.courseId) || 'Formation',
            p.amount || 0,
            methodLabel,
            p.transactionReference || '-',
            p.notes || ''
          ];
        });
        exportToCSV(`comptabilite_versements_${new Date().toISOString().split('T')[0]}`, headers, rows);
        toast.success(`${filteredPayments.length} versement(s) exporté(s) vers Excel (CSV) !`);
      } else {
        const headers = [
          'N°',
          'Élève',
          'Téléphone',
          'Email',
          'Date d\'Inscription',
          'Délai (Jours)',
          'Statut Retard',
          'Formations',
          'Total Formation (FCFA)',
          'Total Payé (FCFA)',
          'Solde Impayé Restant (FCFA)'
        ];
        const rows = filteredReminders.map((s, index) => {
          const studentRegs = (Array.isArray(registrations) ? registrations : []).filter(r => r && r.studentId === s.id);
          const courseNamesStr = studentRegs
            .map(r => courses.find(c => c.id === r.courseId)?.name)
            .filter(Boolean)
            .join(', ');
          
          const totalStudentFee = studentRegs.reduce((sum, r) => {
            const course = courses.find(c => c.id === r.courseId);
            return sum + (course?.price || 0);
          }, 0);

          const studentPayments = safePayments.filter(p => p.studentId === s.id);
          const totalStudentPaid = studentPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
          const balance = getStudentBalance(s.id);
          const days = getDaysSinceRegistration(s);
          const overdueInfo = getOverdueInfo(s);

          return [
            index + 1,
            `${s.firstName} ${s.lastName}`,
            s.phoneNumber || '',
            s.email || '',
            getStudentRegistrationDate(s),
            `${days} jours`,
            overdueInfo.label,
            courseNamesStr || 'Filière',
            totalStudentFee,
            totalStudentPaid,
            balance
          ];
        });
        exportToCSV(`comptabilite_impayes_solde_${new Date().toISOString().split('T')[0]}`, headers, rows);
        toast.success(`${filteredReminders.length} dossier(s) d'impayés exporté(s) vers Excel !`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'exportation des données pour la comptabilité.");
    }
  };

  const copyWhatsAppPhoneNumbers = () => {
    const phones = filteredReminders
      .map(s => s.phoneNumber ? s.phoneNumber.replace(/[^0-9+]/g, '') : '')
      .filter(Boolean)
      .join(', ');

    if (!phones) {
      toast.error("Aucun numéro de téléphone disponible dans la liste des relances.");
      return;
    }

    navigator.clipboard.writeText(phones);
    toast.success(`${filteredReminders.length} numéro(s) WhatsApp copié(s) dans le presse-papier !`);
  };

  const openWhatsAppReminderModal = (student: Student) => {
    const studentRegs = registrations.filter(r => r.studentId === student.id);
    const totalStudentFee = getStudentTotalFee(student.id);
    const totalStudentPaid = getStudentTotalPaid(student.id);
    const balance = getStudentBalance(student.id);
    const regDateFormatted = getStudentRegistrationDate(student);
    const days = getDaysSinceRegistration(student);

    const courseNamesStr = studentRegs
      .map(r => courses.find(c => c.id === r.courseId)?.name)
      .filter(Boolean)
      .join(', ') || 'Formation';

    const initialPhone = student.phoneNumber || student.emergencyContact || '';

    const message = `📣 *ALERTE RÈGLEMENT - ${centerSettings.name}*\n` +
      `----------------------------------\n` +
      `👤 *Élève* : ${student.firstName} ${student.lastName}\n` +
      `📚 *Formation(s)* : ${courseNamesStr}\n` +
      `📅 *Date Inscription* : ${regDateFormatted} (${days} jours)\n` +
      `----------------------------------\n` +
      `💵 *Frais Totaux* : ${totalStudentFee.toLocaleString()} FCFA\n` +
      `✅ *Montant Payé* : ${totalStudentPaid.toLocaleString()} FCFA\n` +
      `⚠️ *SOLDE RESTANT* : ${balance.toLocaleString()} FCFA\n` +
      `----------------------------------\n` +
      `Bonjour, nous prions les parents de bien vouloir procéder au règlement du solde restant (${balance.toLocaleString()} FCFA) pour l'élève.\n\n` +
      `Merci pour votre coopération !\n` +
      `La Direction, ${centerSettings.name}`;

    setSelectedReminderStudent(student);
    setReminderTargetPhone(initialPhone);
    setReminderCustomMessage(message);
    setIsReminderModalOpen(true);
  };

  const handleSendWhatsAppReminderModal = () => {
    if (!reminderTargetPhone || !reminderTargetPhone.trim()) {
      toast.error("Veuillez saisir un numéro de téléphone WhatsApp valide.");
      return;
    }
    const cleanPhone = reminderTargetPhone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 6) {
      toast.error("Le numéro de téléphone saisi semble invalide.");
      return;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderCustomMessage)}`;
    window.open(url, '_blank');
    toast.success("Alerte WhatsApp ouverte !");
    setIsReminderModalOpen(false);
  };

  const sendWhatsAppReceipt = (payment: Payment & { id: string }) => {
    const student = students.find(s => s.id === payment.studentId);
    const phone = student?.phoneNumber || student?.emergencyContact;

    if (!phone) {
      setPreviewPayment(payment);
      setIsInvoicePreviewOpen(true);
      toast.info("Aucun numéro enregistré. Saisissez le numéro du parent dans l'aperçu du reçu.");
      return;
    }

    const studentName = student ? `${student.firstName} ${student.lastName}` : 'l\'élève';
    const courseName = payment.courseId ? getCourseName(payment.courseId) : '';
    const balance = payment.courseId ? getStudentBalance(payment.studentId, payment.courseId) : getStudentBalance(payment.studentId);
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');

    const methodLabel = payment.paymentMethod === 'cash' ? 'ESPÈCES' : payment.paymentMethod === 'wave' ? 'WAVE' : payment.paymentMethod === 'orange_money' ? 'ORANGE MONEY' : payment.paymentMethod === 'transfer' ? 'VIREMENT / MOBILE' : 'CHÈQUE';

    const message = `📄 *REÇU DE PAIEMENT - ${centerSettings.name}*\n` +
      `----------------------------------\n` +
      `🔹 *N° Reçu* : ${payment.id.substring(0, 8).toUpperCase()}\n` +
      `👤 *Élève* : ${studentName}\n` +
      `📅 *Date* : ${payment.paymentDate}\n` +
      `${courseName ? `📚 *Formation* : ${courseName}\n` : ''}` +
      `💵 *Montant Versé* : ${payment.amount.toLocaleString()} FCFA\n` +
      `💳 *Mode de Règlement* : ${methodLabel}${payment.referenceNumber ? ` (Réf: ${payment.referenceNumber})` : ''}\n` +
      `----------------------------------\n` +
      `${balance > 0 ? `⚠️ *Solde Restant* : ${balance.toLocaleString()} FCFA` : `✅ *Statut* : SOLDE RÉGLÉ (0 FCFA)`}\n` +
      `----------------------------------\n` +
      `Merci pour votre confiance !\n` +
      `La direction, ${centerSettings.name}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    toast.success(`Reçu préparé pour WhatsApp (${studentName})`);
  };

  // Filter students inside modal
  const modalStudentList = useMemo(() => {
    const q = studentSearchInModal.toLowerCase().trim();
    if (!q) return safeStudents;
    return safeStudents.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.phoneNumber && s.phoneNumber.toLowerCase().includes(q))
    );
  }, [safeStudents, studentSearchInModal]);

  const previewStudent = useMemo(() => {
    if (!previewPayment) return null;
    return students.find(s => s.id === previewPayment.studentId) || null;
  }, [previewPayment, students]);

  return (
    <>
      <Invoice 
        isOpen={isInvoicePreviewOpen}
        onClose={() => setIsInvoicePreviewOpen(false)}
        payment={previewPayment}
        studentName={previewPayment ? getStudentName(previewPayment.studentId) : ''}
        courseName={previewPayment ? getCourseName(previewPayment.courseId) : ''}
        balance={previewPayment ? getStudentBalance(previewPayment.studentId, previewPayment.courseId) : 0}
        studentPhoneNumber={previewStudent?.phoneNumber}
        emergencyContact={previewStudent?.emergencyContact}
        onDelete={(p) => {
          setIsInvoicePreviewOpen(false);
          handleDelete(p);
        }}
        centerSettings={centerSettings}
      />

      <div className="space-y-6 print:hidden text-left">
        
        {/* Visual Alert Banner for Retards de Paiement */}
        {overdueStats.criticalCount > 0 && (
          <div className="p-4 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-rose-500/10 border-2 border-red-200 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-md shrink-0">
                <AlertTriangle size={24} className="animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase rounded-full tracking-wider">
                    Alerte Retards
                  </span>
                  <h4 className="font-serif text-base font-bold text-red-950">
                    {overdueStats.criticalCount} élève(s) en retard critique de paiement (+30 jours)
                  </h4>
                </div>
                <p className="text-xs text-red-900/80 mt-0.5">
                  Montant en souffrance critique : <strong className="text-red-700 font-bold">{overdueStats.criticalAmount.toLocaleString()} FCFA</strong>.
                  {overdueStats.moderateCount > 0 && (
                    <span> Et {overdueStats.moderateCount} élève(s) en retard modéré ({overdueStats.moderateAmount.toLocaleString()} FCFA).</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button
                onClick={() => {
                  setActiveTab('reminders');
                  setDelayFilter('critical');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Siren size={14} />
                Filtrer Retards Critiques ({overdueStats.criticalCount})
              </button>
            </div>
          </div>
        )}

        {/* Top Header & Fast Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Encaissé */}
          <div className="bg-white p-5 rounded-3xl border border-[#E5E5E0] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Total Encaissé</span>
              <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <DollarSign size={20} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-serif font-bold text-emerald-900">
                {totalEncaisseTotal.toLocaleString()} <span className="text-xs font-sans font-normal opacity-60">FCFA</span>
              </p>
              <p className="text-[11px] text-[#8E9299] mt-1 font-medium flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                {safePayments.length} paiement(s) enregistré(s)
              </p>
            </div>
          </div>

          {/* Card 2: Balances Impayées */}
          <div className="bg-white p-5 rounded-3xl border border-[#E5E5E0] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Reste à Recouvrer</span>
              <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                <Bell size={20} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-serif font-bold text-rose-600">
                {totalImpayes.toLocaleString()} <span className="text-xs font-sans font-normal opacity-60">FCFA</span>
              </p>
              <div className="text-[11px] text-[#8E9299] mt-1 font-medium flex items-center gap-1 flex-wrap">
                <User size={13} className="text-rose-500" />
                <span>{filteredReminders.length} en attente</span>
                {overdueStats.criticalCount > 0 && (
                  <button
                    onClick={() => {
                      setActiveTab('reminders');
                      setDelayFilter('critical');
                    }}
                    className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-full text-[10px] hover:bg-red-200 transition-colors"
                  >
                    🔴 {overdueStats.criticalCount} critiques
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Taux de Recouvrement */}
          <div className="bg-white p-5 rounded-3xl border border-[#E5E5E0] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Taux de Recouvrement</span>
              <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <ShieldCheck size={20} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <p className="text-2xl font-serif font-bold text-blue-900">{recoveryRate}%</p>
                <span className="text-[10px] font-bold text-blue-600 uppercase">Recouvré</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, recoveryRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Quick New Payment Action */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2D312E] p-5 rounded-3xl text-white shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">Action Rapide</span>
              <div className="p-2 bg-white/10 rounded-xl text-emerald-400">
                <Sparkles size={18} />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3 text-slate-200">Enregistrer un versement élève immédiatement</p>
              <button
                onClick={() => {
                  setError(null);
                  setStudentSearchInModal('');
                  setFormData({
                    studentId: '',
                    courseId: '',
                    amount: 0,
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMethod: 'cash',
                    referenceNumber: '',
                    description: ''
                  });
                  setIsModalOpen(true);
                }}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Nouveau Paiement
              </button>
            </div>
          </div>

        </div>

        {/* Tableau de Bord Trésorerie & Revenus Mensuels (Graphique en courbes) */}
        <div className="bg-white p-6 rounded-3xl border border-[#E5E5E0] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0F0EE]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
                <TrendingUp size={22} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">Graphique de Trésorerie & Revenus Mensuels</h3>
                <p className="text-xs text-[#8E9299]">Évolution temporelle des encaissements d'élèves</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex bg-[#F5F5F0] p-1 rounded-2xl">
                <button
                  onClick={() => setChartTimeRange('6')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                    chartTimeRange === '6' ? 'bg-white text-emerald-900 shadow-sm' : 'text-[#8E9299] hover:text-[#1A1A1A]'
                  }`}
                >
                  6 mois
                </button>
                <button
                  onClick={() => setChartTimeRange('12')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                    chartTimeRange === '12' ? 'bg-white text-emerald-900 shadow-sm' : 'text-[#8E9299] hover:text-[#1A1A1A]'
                  }`}
                >
                  12 mois
                </button>
              </div>

              <button
                onClick={() => setShowChartDetails(!showChartDetails)}
                className="px-3.5 py-2 bg-[#F9F9F7] border border-[#E5E5E0] text-[#1A1A1A] hover:bg-[#F0F0EE] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <BarChart3 size={14} />
                {showChartDetails ? 'Masquer détails' : 'Détails par méthode'}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#F9F9F7] p-3.5 rounded-2xl border border-[#E5E5E0]">
              <p className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider">Cumul Période</p>
              <p className="text-base font-bold text-emerald-900 mt-0.5">{chartMetrics.totalPeriod.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-[#F9F9F7] p-3.5 rounded-2xl border border-[#E5E5E0]">
              <p className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider">Moyenne Mensuelle</p>
              <p className="text-base font-bold text-[#1A1A1A] mt-0.5">{chartMetrics.avgMonthly.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-[#F9F9F7] p-3.5 rounded-2xl border border-[#E5E5E0]">
              <p className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider">Meilleur Mois</p>
              <p className="text-base font-bold text-emerald-700 mt-0.5">
                {chartMetrics.bestMonth ? `${chartMetrics.bestMonth.label} (${chartMetrics.bestMonth.revenue.toLocaleString()} F)` : 'N/A'}
              </p>
            </div>
            <div className="bg-[#F9F9F7] p-3.5 rounded-2xl border border-[#E5E5E0]">
              <p className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider">Évolution Récente</p>
              <div className="flex items-center gap-1 mt-0.5">
                {chartMetrics.growth >= 0 ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                    <ArrowUpRight size={14} /> +{chartMetrics.growth}% vs mois dernier
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-0.5">
                    <ArrowDownRight size={14} /> {chartMetrics.growth}% vs mois dernier
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recharts Area / Line Chart */}
          <div className="w-full h-72 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E0" />
                <XAxis 
                  dataKey="label" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#8E9299', fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#8E9299', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  dx={-5}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const val = payload[0].value as number;
                      const count = payload[0].payload.count as number;
                      return (
                        <div className="bg-[#1A1A1A] text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-1 border border-white/10">
                          <p className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">{label}</p>
                          <p className="text-base font-bold">{val.toLocaleString()} FCFA</p>
                          <p className="text-[10px] text-slate-300">{count} versement(s) encaissé(s)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenus (FCFA)" 
                  stroke="#059669" 
                  strokeWidth={3.5} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, fill: '#047857', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Optional Method Breakdown */}
          {showChartDetails && (
            <div className="pt-4 border-t border-[#F0F0EE] grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-800 uppercase">Espèces</p>
                <p className="text-sm font-bold text-emerald-950 mt-1">{methodBreakdown.cash.toLocaleString()} F</p>
              </div>
              <div className="bg-cyan-50/60 p-3 rounded-2xl border border-cyan-100">
                <p className="text-[10px] font-bold text-cyan-800 uppercase">Wave</p>
                <p className="text-sm font-bold text-cyan-950 mt-1">{methodBreakdown.wave.toLocaleString()} F</p>
              </div>
              <div className="bg-orange-50/60 p-3 rounded-2xl border border-orange-100">
                <p className="text-[10px] font-bold text-orange-800 uppercase">Orange Money</p>
                <p className="text-sm font-bold text-orange-950 mt-1">{methodBreakdown.orange.toLocaleString()} F</p>
              </div>
              <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-800 uppercase">Virement</p>
                <p className="text-sm font-bold text-blue-950 mt-1">{methodBreakdown.transfer.toLocaleString()} F</p>
              </div>
              <div className="bg-purple-50/60 p-3 rounded-2xl border border-purple-100 col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-purple-800 uppercase">Chèque</p>
                <p className="text-sm font-bold text-purple-950 mt-1">{methodBreakdown.check.toLocaleString()} F</p>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white p-4 rounded-3xl border border-[#E5E5E0] shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299] group-focus-within:text-emerald-600 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Rechercher élève, référence ou note..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-sm placeholder:text-[#8E9299]/60"
              />
            </div>

            {/* Course Dropdown */}
            <div className="w-full lg:w-56">
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

            {/* Method Dropdown */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full lg:w-auto px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-xs font-semibold text-[#1A1A1A] cursor-pointer"
            >
              <option value="">Toutes les méthodes</option>
              <option value="cash">Espèces</option>
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="transfer">Virement Bancaire</option>
              <option value="check">Chèque</option>
            </select>

            {/* Delay Alert Filter */}
            <select
              value={delayFilter}
              onChange={(e) => setDelayFilter(e.target.value as any)}
              className="w-full lg:w-auto px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-xs font-semibold text-[#1A1A1A] cursor-pointer"
            >
              <option value="all">Tous les délais d'inscription</option>
              <option value="critical">🔴 Retard Critique (&gt; 30 jours)</option>
              <option value="moderate">🟠 Retard Modéré (15 - 30 jours)</option>
              <option value="recent">🔵 Inscription Récente (&lt; 15 jours)</option>
            </select>

            {/* Period Filters */}
            <div className="flex gap-1 bg-[#F5F5F0] p-1 rounded-2xl w-full lg:w-auto justify-center">
              <button
                onClick={() => setPeriodFilter('all')}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  periodFilter === 'all' ? 'bg-white text-emerald-900 shadow-sm' : 'text-[#8E9299] hover:text-[#1A1A1A]'
                }`}
              >
                Tout
              </button>
              <button
                onClick={() => setPeriodFilter('today')}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  periodFilter === 'today' ? 'bg-white text-emerald-900 shadow-sm' : 'text-[#8E9299] hover:text-[#1A1A1A]'
                }`}
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => setPeriodFilter('month')}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  periodFilter === 'month' ? 'bg-white text-emerald-900 shadow-sm' : 'text-[#8E9299] hover:text-[#1A1A1A]'
                }`}
              >
                Ce mois
              </button>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                onClick={handleExportPaymentsExcel}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl transition-all shadow-sm active:scale-95 text-xs font-bold uppercase tracking-wider shrink-0"
                title="Exporter les données au format Excel pour comptabilité externe"
              >
                <FileSpreadsheet size={16} />
                Exporter Excel
              </button>

              <button
                onClick={handleExportPaymentsPDF}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-2xl hover:bg-emerald-100 transition-all shadow-sm active:scale-95 text-xs font-bold uppercase tracking-wider shrink-0"
                title="Imprimer ou télécharger le rapport PDF"
              >
                <Download size={15} />
                Exporter PDF
              </button>
            </div>

          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2 p-1.5 bg-[#F5F5F0] rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === 'history' ? 'bg-white text-emerald-900 shadow-sm' : 'text-[#8E9299] hover:text-[#1A1A1A]'
              }`}
            >
              <History size={15} />
              Historique des versements ({filteredPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === 'reminders' ? 'bg-white text-rose-600 shadow-sm' : 'text-[#8E9299] hover:text-[#1A1A1A]'
              }`}
            >
              <Bell size={15} />
              Rappels & Impayés ({filteredReminders.length})
            </button>
          </div>

          {activeTab === 'history' && periodFilter !== 'all' && (
            <span className="text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Montant sélectionné: <strong>{totalEncaisseFiltered.toLocaleString()} FCFA</strong>
            </span>
          )}
        </div>

        {/* Content Table / Grid */}
        <div className="bg-white rounded-3xl border border-[#E5E5E0] overflow-hidden shadow-sm">
          {activeTab === 'history' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F9F9F7] text-[#8E9299] text-[10px] uppercase tracking-widest">
                    <th className="px-6 py-4 font-bold">Élève & Formation</th>
                    <th className="px-6 py-4 font-bold">Montant Versé</th>
                    <th className="px-6 py-4 font-bold">Méthode & Réf</th>
                    <th className="px-6 py-4 font-bold">Date</th>
                    <th className="px-6 py-4 font-bold">Solde Restant</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {filteredPayments.length > 0 ? filteredPayments.map((p, pIdx) => {
                    const currentBalance = p.courseId ? getStudentBalance(p.studentId, p.courseId) : getStudentBalance(p.studentId);
                    return (
                      <tr key={`${p.id}-${pIdx}`} className="hover:bg-[#F9F9F7] transition-colors group">
                        
                        {/* Student & Course */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {getStudentName(p.studentId).charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1A1A1A]">{getStudentName(p.studentId)}</p>
                              <p className="text-[11px] text-[#8E9299] font-medium">
                                {p.courseId ? getCourseName(p.courseId) : 'Paiement Global'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-emerald-900">{p.amount.toLocaleString()} FCFA</span>
                          {p.description && (
                            <p className="text-[10px] text-[#8E9299] truncate max-w-[150px]">{p.description}</p>
                          )}
                        </td>

                        {/* Method & Ref */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            {getMethodBadge(p.paymentMethod)}
                            {p.referenceNumber && (
                              <span className="text-[10px] text-[#8E9299] font-mono">Réf: {p.referenceNumber}</span>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-xs font-medium text-[#555]">
                          {p.paymentDate}
                        </td>

                        {/* Balance Remaining */}
                        <td className="px-6 py-4">
                          {currentBalance > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                              Reste {currentBalance.toLocaleString()} FCFA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                              <Check size={12} /> Solde Réglé
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 shrink-0">
                            <button 
                              onClick={() => sendWhatsAppReceipt(p)}
                              className="px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border border-emerald-300 shadow-xs active:scale-95"
                              title="Envoyer le reçu directement au parent sur WhatsApp"
                            >
                              <Send size={13} className="text-emerald-700" />
                              <span>WhatsApp</span>
                            </button>
                            <button 
                              onClick={() => {
                                setPreviewPayment(p);
                                setIsInvoicePreviewOpen(true);
                              }}
                              className="px-3 py-2 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border border-slate-300 shadow-xs active:scale-95"
                              title="Aperçu & Imprimer le Reçu"
                            >
                              <ReceiptText size={14} className="text-slate-700" />
                              <span>Reçu</span>
                            </button>
                            <button 
                              onClick={() => handleDelete(p)}
                              className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border border-rose-300 shadow-xs active:scale-95"
                              title="Supprimer ce versement"
                            >
                              <Trash2 size={14} className="text-rose-600" />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-[#8E9299] italic text-sm">
                        Aucun paiement trouvé pour ces critères de recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            
            /* Reminders & Unpaid Tab */
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F9F9F7] text-[#8E9299] text-[10px] uppercase tracking-widest">
                    <th className="px-6 py-4 font-bold">Élève</th>
                    <th className="px-6 py-4 font-bold">Inscription & Alerte Retard</th>
                    <th className="px-6 py-4 font-bold">Formations & Progrès</th>
                    <th className="px-6 py-4 font-bold">Téléphone</th>
                    <th className="px-6 py-4 font-bold">Montant Dû</th>
                    <th className="px-6 py-4 font-bold text-right">Actions de Règlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {filteredReminders.length > 0 ? (
                    filteredReminders.map((s, sIdx) => {
                      const studentRegs = registrations.filter(r => r.studentId === s.id);
                      const totalStudentFee = getStudentTotalFee(s.id);
                      const totalStudentPaid = getStudentTotalPaid(s.id);
                      const balance = getStudentBalance(s.id);
                      const progressPct = totalStudentFee > 0 ? Math.round((totalStudentPaid / totalStudentFee) * 100) : 0;

                      const overdueInfo = getOverdueInfo(s);
                      const regDateFormatted = getStudentRegistrationDate(s);

                      const courseNamesStr = studentRegs
                        .map(r => courses.find(c => c.id === r.courseId)?.name)
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <tr key={`${s.id}-${sIdx}`} className={`transition-colors ${overdueInfo.rowClass}`}>
                          
                          {/* Student */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${overdueInfo.level === 'critical' ? 'bg-red-200 text-red-900 font-black' : overdueInfo.level === 'moderate' ? 'bg-amber-200 text-amber-900 font-bold' : 'bg-rose-100 text-rose-700'} rounded-xl flex items-center justify-center text-sm uppercase shrink-0 shadow-sm`}>
                                {s.firstName.charAt(0)}{s.lastName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#1A1A1A]">{s.firstName} {s.lastName}</p>
                                <p className="text-[11px] text-[#8E9299]">{s.email || 'Pas d\'email'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Registration Date & Overdue Visual Alert Badge */}
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#444]">
                                <Calendar size={13} className="text-[#8E9299]" />
                                <span>Inscrit le <strong>{regDateFormatted}</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shadow-xs ${overdueInfo.badgeBg} ${overdueInfo.badgeText} ${overdueInfo.badgeBorder}`}>
                                  {overdueInfo.level === 'critical' && (
                                    <span className="relative flex h-2 w-2 shrink-0">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                                    </span>
                                  )}
                                  {overdueInfo.level === 'critical' && <AlertTriangle size={12} className="shrink-0 text-red-700" />}
                                  {overdueInfo.level === 'moderate' && <Clock size={12} className="shrink-0 text-amber-700" />}
                                  {overdueInfo.label}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Enrolled Courses & Progress Bar */}
                          <td className="px-6 py-5 min-w-[200px]">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1">
                                {studentRegs.map((r, rIdx) => {
                                  const c = courses.find(course => course.id === r.courseId);
                                  const cBalance = getStudentBalance(s.id, r.courseId);
                                  return (
                                    <span 
                                      key={`${r.id || r.courseId}-${rIdx}`} 
                                      onClick={() => openPaymentForStudent(s.id, r.courseId)}
                                      className="cursor-pointer text-[10px] font-semibold bg-white/80 text-rose-800 border border-rose-200 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition-colors shadow-2xs"
                                      title="Cliquer pour régler cette formation"
                                    >
                                      {c?.name}: {cBalance.toLocaleString()} FCFA
                                    </span>
                                  );
                                })}
                              </div>

                              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${progressPct}%` }} />
                              </div>
                              <p className="text-[10px] text-[#8E9299]">
                                Payé {totalStudentPaid.toLocaleString()} / {totalStudentFee.toLocaleString()} FCFA ({progressPct}%)
                              </p>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-6 py-5">
                            <span className="text-xs font-semibold text-[#1A1A1A]">{s.phoneNumber || 'N/A'}</span>
                          </td>

                          {/* Balance */}
                          <td className="px-6 py-5">
                            <span className="text-base font-extrabold text-rose-600">{balance.toLocaleString()} FCFA</span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openWhatsAppReminderModal(s)}
                                className="px-3.5 py-2 bg-[#25D366] text-white hover:bg-[#20bd5a] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                                title="Alerter le parent ou l'élève sur WhatsApp pour le solde impayé"
                              >
                                <Send size={13} />
                                Alerte WhatsApp
                              </button>

                              <button 
                                onClick={() => openPaymentForStudent(s.id)}
                                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-rose-700 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                              >
                                <DollarSign size={14} />
                                Régler
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-emerald-600 italic text-sm">
                        ✨ Aucun impayé correspondant aux critères. Tous les élèves de ce filtre sont à jour !
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Enregistrer un paiement */}
        <AnimatePresence>
          {isModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 m-auto w-full max-w-xl h-fit max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] shadow-2xl z-50 p-6 md:p-8 border border-[#E5E5E0] text-left"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#F0F0EE]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700">
                      <ReceiptText size={24} />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-[#1A1A1A]">Enregistrer un paiement</h3>
                      <p className="text-xs text-[#8E9299]">Versement d'élève et mise à jour du solde</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-[#8E9299] hover:text-[#1A1A1A] hover:bg-[#F5F5F0] rounded-full transition-all"
                  >
                    ✕
                  </button>
                </div>
                
                {error && (
                  <div className="mb-5 p-3.5 bg-red-50 border border-red-200/80 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2">
                    <Bell size={16} className="shrink-0 text-red-600" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Step 1: Student Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">
                      Élève à créditer <span className="text-red-500">*</span>
                    </label>

                    <SearchableSelect
                      value={formData.studentId}
                      onChange={(sid) => {
                        setError(null);
                        const initialBal = getStudentBalance(sid);
                        setFormData({ 
                          ...formData, 
                          studentId: sid, 
                          courseId: '',
                          amount: Math.max(0, initialBal),
                          description: sid ? 'Règlement de frais de formation' : ''
                        });
                      }}
                      placeholder="Taper le nom ou téléphone de l'élève..."
                      required={true}
                      options={students.map(s => {
                        const bal = getStudentBalance(s.id);
                        return {
                          value: s.id,
                          label: `${s.firstName} ${s.lastName}`,
                          sublabel: `${s.phoneNumber ? `Tél: ${s.phoneNumber} - ` : ''}${bal > 0 ? `Dû: ${bal.toLocaleString()} FCFA` : 'Solde à jour'}`
                        };
                      })}
                    />
                  </div>

                  {/* Step 2: Course / Balance Summary */}
                  {formData.studentId && (
                    <div className="space-y-4 pt-1">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">
                          Attribution de la formation
                        </label>
                        <SearchableSelect
                          value={formData.courseId}
                          onChange={(cid) => {
                            setError(null);
                            const balance = getStudentBalance(formData.studentId, cid);
                            setFormData({ 
                              ...formData, 
                              courseId: cid, 
                              amount: Math.max(0, balance),
                              description: cid ? `Règlement pour la formation ${getCourseName(cid)}` : 'Règlement du solde global'
                            });
                          }}
                          placeholder="Paiement Global (Répartition sur le solde général)"
                          options={[
                            { value: "", label: "Paiement Global (Répartition sur le solde général)" },
                            ...registrations
                              .filter(r => r.studentId === formData.studentId)
                              .map(r => {
                                const course = courses.find(c => c.id === r.courseId);
                                const balance = getStudentBalance(formData.studentId, r.courseId);
                                return {
                                  value: r.courseId,
                                  label: course ? course.name : 'Formation',
                                  sublabel: `Reste à payer: ${balance.toLocaleString()} FCFA`
                                };
                              })
                          ]}
                        />
                      </div>

                      {/* Financial Card */}
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-900/60 mb-0.5">
                              {formData.courseId ? `Reste sur: ${getCourseName(formData.courseId)}` : 'Reste Global Dû'}
                            </p>
                            <p className="text-xl font-serif font-bold text-emerald-950">
                              {getStudentBalance(formData.studentId, formData.courseId).toLocaleString()} FCFA
                            </p>
                          </div>
                          <div className="p-2.5 bg-white rounded-2xl shadow-sm text-emerald-600">
                            <DollarSign size={20} />
                          </div>
                        </div>

                        {/* Quick Presets */}
                        {getStudentBalance(formData.studentId, formData.courseId) > 0 && (
                          <div className="pt-2 border-t border-emerald-200/50">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-900/70 mb-2">Saisie Rapide 1-Clic :</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, amount: getStudentBalance(formData.studentId, formData.courseId) })}
                                className="px-3 py-1.5 bg-emerald-800 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-900 transition-all shadow-sm"
                              >
                                Tout régler ({getStudentBalance(formData.studentId, formData.courseId).toLocaleString()} FCFA)
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, amount: Math.round(getStudentBalance(formData.studentId, formData.courseId) / 2) })}
                                className="px-3 py-1.5 bg-white text-emerald-900 border border-emerald-300 rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-100 transition-all"
                              >
                                50% Acompte ({Math.round(getStudentBalance(formData.studentId, formData.courseId) / 2).toLocaleString()} FCFA)
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, amount: 50000 })}
                                className="px-2.5 py-1.5 bg-white text-emerald-900 border border-emerald-300 rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-100 transition-all"
                              >
                                50 000 FCFA
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, amount: 25000 })}
                                className="px-2.5 py-1.5 bg-white text-emerald-900 border border-emerald-300 rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-100 transition-all"
                              >
                                25 000 FCFA
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Amount & Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">
                        Montant Versé (FCFA) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={formData.amount || ''}
                        onChange={(e) => {
                          setError(null);
                          setFormData({ ...formData, amount: Number(e.target.value) });
                        }}
                        className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-emerald-900"
                        placeholder="Ex: 50000"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Date de Règlement</label>
                      <input
                        type="date"
                        required
                        value={formData.paymentDate}
                        onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Payment Method Pill Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Mode de Règlement</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                        className={`py-2.5 px-2 rounded-xl text-[10px] font-bold uppercase border transition-all flex flex-col items-center gap-1 ${
                          formData.paymentMethod === 'cash' 
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm' 
                            : 'bg-white text-[#555] border-[#E5E5E0] hover:bg-[#F9F9F7]'
                        }`}
                      >
                        <DollarSign size={16} />
                        Espèces
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: 'wave' })}
                        className={`py-2.5 px-2 rounded-xl text-[10px] font-bold uppercase border transition-all flex flex-col items-center gap-1 ${
                          formData.paymentMethod === 'wave' 
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' 
                            : 'bg-white text-[#555] border-[#E5E5E0] hover:bg-[#F9F9F7]'
                        }`}
                      >
                        <Smartphone size={16} />
                        Wave
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: 'orange_money' })}
                        className={`py-2.5 px-2 rounded-xl text-[10px] font-bold uppercase border transition-all flex flex-col items-center gap-1 ${
                          formData.paymentMethod === 'orange_money' 
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                            : 'bg-white text-[#555] border-[#E5E5E0] hover:bg-[#F9F9F7]'
                        }`}
                      >
                        <Smartphone size={16} />
                        Orange
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: 'transfer' })}
                        className={`py-2.5 px-2 rounded-xl text-[10px] font-bold uppercase border transition-all flex flex-col items-center gap-1 ${
                          formData.paymentMethod === 'transfer' 
                            ? 'bg-blue-800 text-white border-blue-800 shadow-sm' 
                            : 'bg-white text-[#555] border-[#E5E5E0] hover:bg-[#F9F9F7]'
                        }`}
                      >
                        <CreditCard size={16} />
                        Virement
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: 'check' })}
                        className={`py-2.5 px-2 rounded-xl text-[10px] font-bold uppercase border transition-all flex flex-col items-center gap-1 ${
                          formData.paymentMethod === 'check' 
                            ? 'bg-purple-800 text-white border-purple-800 shadow-sm' 
                            : 'bg-white text-[#555] border-[#E5E5E0] hover:bg-[#F9F9F7]'
                        }`}
                      >
                        <CreditCard size={16} />
                        Chèque
                      </button>
                    </div>
                  </div>

                  {/* Reference & Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Référence Transaction (Optionnel)</label>
                      <input
                        type="text"
                        placeholder="Ex: Ref Wave W12345 / N° Chèque"
                        value={formData.referenceNumber}
                        onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">Note / Description</label>
                      <input
                        placeholder="Ex: Premier acompte de scolarité"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                      />
                    </div>
                  </div>

                  {/* Submit Actions */}
                  <div className="flex gap-3 pt-4 border-t border-[#F0F0EE]">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="flex-1 px-6 py-3.5 border border-[#E5E5E0] rounded-2xl text-xs font-bold uppercase tracking-wider text-[#8E9299] hover:bg-[#F9F9F7] transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 px-6 py-3.5 bg-emerald-900 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-950 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Valider le paiement
                    </button>
                  </div>

                </form>
              </motion.div>
            </>
          )}

          {/* Delete Confirmation Modal */}
          {isDeleteModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDeleteModalOpen(false)}
                className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white rounded-[2.5rem] shadow-2xl z-[70] p-8 border border-[#E5E5E0] text-center"
              >
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="font-serif text-2xl font-bold mb-2 text-[#1A1A1A]">Supprimer ce versement ?</h3>
                <p className="text-xs text-[#8E9299] mb-8 leading-relaxed">
                  Cette annulation mettra à jour instantanément le solde de l'élève et retirera la transaction de l'historique financier.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 px-6 py-3.5 border border-[#E5E5E0] rounded-2xl text-xs font-bold uppercase text-[#8E9299] hover:bg-[#F9F9F7] transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-3.5 bg-red-600 text-white rounded-2xl text-xs font-bold uppercase hover:bg-red-700 transition-all shadow-md active:scale-95"
                  >
                    Confirmer
                  </button>
                </div>
              </motion.div>
            </>
          )}

          {/* WhatsApp Reminder Alert Modal */}
          {isReminderModalOpen && selectedReminderStudent && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsReminderModalOpen(false)}
                className="fixed inset-0 bg-[#1A1A1A]/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl z-[90] border border-[#E5E5E0] text-left space-y-5"
              >
                <div className="flex justify-between items-center pb-3 border-b border-[#F0F0EE]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center font-bold">
                      <Send size={20} />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-lg text-[#1A1A1A]">Relance Solde Impayé WhatsApp</h4>
                      <p className="text-xs text-[#8E9299]">Alerte parent / élève pour le reste à payer</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsReminderModalOpen(false)}
                    className="p-1.5 text-[#8E9299] hover:text-[#1A1A1A] hover:bg-[#F5F5F0] rounded-full transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Target Phone Number & Quick Chips */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E9299] flex items-center gap-1.5">
                    <Phone size={13} />
                    Numéro WhatsApp du Parent / Élève <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reminderTargetPhone}
                    onChange={(e) => setReminderTargetPhone(e.target.value)}
                    placeholder="Ex: 22376000000"
                    className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 text-sm font-mono font-semibold"
                  />
                  {(selectedReminderStudent.phoneNumber || selectedReminderStudent.emergencyContact) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedReminderStudent.phoneNumber && (
                        <button
                          type="button"
                          onClick={() => setReminderTargetPhone(selectedReminderStudent.phoneNumber)}
                          className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl hover:bg-emerald-100 font-medium flex items-center gap-1 transition-all"
                        >
                          <Smartphone size={12} /> Tél Élève: {selectedReminderStudent.phoneNumber}
                        </button>
                      )}
                      {selectedReminderStudent.emergencyContact && (
                        <button
                          type="button"
                          onClick={() => setReminderTargetPhone(selectedReminderStudent.emergencyContact)}
                          className="text-[11px] px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl hover:bg-amber-100 font-medium flex items-center gap-1 transition-all"
                        >
                          <Phone size={12} /> Contact Parent: {selectedReminderStudent.emergencyContact}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Message Editor */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E9299] flex items-center gap-1.5">
                    <MessageSquare size={13} />
                    Message d'Alerte (Personnalisable)
                  </label>
                  <textarea
                    rows={8}
                    value={reminderCustomMessage}
                    onChange={(e) => setReminderCustomMessage(e.target.value)}
                    className="w-full p-3.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 text-xs font-mono leading-relaxed"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReminderModalOpen(false)}
                    className="flex-1 px-5 py-3 border border-[#E5E5E0] rounded-2xl text-xs font-bold uppercase text-[#8E9299] hover:bg-[#F9F9F7] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsAppReminderModal}
                    className="flex-1 px-5 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Send size={15} />
                    Envoyer sur WhatsApp
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
};
