import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, Course, Payment, Teacher } from '../types';

interface CenterInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

const DEFAULT_CENTER_NAME = 'kalan gest KG';

/**
 * Format currency to FCFA
 */
const formatFCFA = (amount: number): string => {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
};

/**
 * Format ISO date string to DD/MM/YYYY
 */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR');
  } catch {
    return dateStr;
  }
};

/**
 * Helper to calculate student balance
 */
const calculateStudentBalance = (
  studentId: string,
  registrations: any[],
  courses: Course[],
  payments: Payment[],
  courseId?: string
): number => {
  const safeRegs = Array.isArray(registrations) ? registrations : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeCourses = Array.isArray(courses) ? courses : [];

  const studentRegs = safeRegs.filter(
    (r) => r && r.studentId === studentId && (!courseId || r.courseId === courseId)
  );
  const totalFees = studentRegs.reduce((acc, reg) => {
    const course = safeCourses.find((c) => c && c.id === reg.courseId);
    return acc + (course?.price || 0);
  }, 0);

  const totalPaid = safePayments
    .filter((p) => p && p.studentId === studentId && (!courseId || p.courseId === courseId))
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  return totalFees - totalPaid;
};

/**
 * Draw header banner on PDF document
 */
const drawHeader = (doc: jsPDF, title: string, subtitle?: string, centerInfo?: CenterInfo) => {
  const centerName = centerInfo?.name || DEFAULT_CENTER_NAME;

  // Header background bar (Emerald Green)
  doc.setFillColor(22, 101, 52); // #166534 emerald-800
  doc.rect(0, 0, 210, 28, 'F');

  // Title in header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(centerName, 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Gestion Pédagogique & Administrative', 14, 20);

  // Right side date / subtitle
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(8);
  doc.text(`Date d'export: ${today}`, 196, 13, { align: 'right' });

  // Document Title below header bar
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 38);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(142, 146, 153);
    doc.text(subtitle, 14, 44);
  }
};

/**
 * Draw footer with page numbers
 */
const addPageFooters = (doc: jsPDF, centerInfo?: CenterInfo) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const centerName = centerInfo?.name || DEFAULT_CENTER_NAME;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);

    // Line above footer
    doc.setDrawColor(229, 229, 224);
    doc.line(14, 282, 196, 282);

    doc.text(`${centerName} — Document officiel`, 14, 287);
    doc.text(`Page ${i} sur ${pageCount}`, 196, 287, { align: 'right' });
  }
};

/**
 * EXPORT 1: Liste des Élèves en PDF
 */
export const exportStudentsPDF = ({
  students = [],
  courses = [],
  registrations = [],
  payments = [],
  courseFilterId = '',
  searchQuery = '',
  centerInfo,
}: {
  students: (Student & { id: string })[];
  courses: Course[];
  registrations: any[];
  payments: Payment[];
  courseFilterId?: string;
  searchQuery?: string;
  centerInfo?: CenterInfo;
}) => {
  const safeStudents = Array.isArray(students) ? students : [];
  const safeCourses = Array.isArray(courses) ? courses : [];
  const safeRegistrations = Array.isArray(registrations) ? registrations : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const selectedCourse = safeCourses.find((c) => c.id === courseFilterId);
  const subtitleParts = [];
  if (selectedCourse) subtitleParts.push(`Formation: ${selectedCourse.name}`);
  if (searchQuery) subtitleParts.push(`Filtre recherche: "${searchQuery}"`);
  subtitleParts.push(`Total: ${safeStudents.length} élève(s)`);

  const subtitle = subtitleParts.join(' | ');

  drawHeader(doc, 'LISTE DES ÉLÈVES', subtitle, centerInfo);

  // Summary KPI Cards in PDF
  let startY = 49;

  const totalStudents = safeStudents.length;
  const activeStudents = safeStudents.filter((s) => s.status === 'active').length;
  const totalBalanceDue = safeStudents.reduce(
    (acc, s) => acc + Math.max(0, calculateStudentBalance(s.id, safeRegistrations, safeCourses, safePayments)),
    0
  );

  // Stats Box background
  doc.setFillColor(249, 249, 247);
  doc.setDrawColor(229, 229, 224);
  doc.roundedRect(14, startY, 182, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(26, 26, 26);

  doc.text(`Élèves Inscrits: ${totalStudents}`, 20, startY + 10);
  doc.text(`Actifs: ${activeStudents}`, 80, startY + 10);
  doc.setTextColor(220, 38, 38); // Red
  doc.text(`Reliquats Totaux Dûs: ${formatFCFA(totalBalanceDue)}`, 130, startY + 10);

  // Table Data Preparation
  const tableData = safeStudents.map((student, index) => {
    // Formations
    const studentRegs = safeRegistrations.filter((r) => r.studentId === student.id);
    const courseNames = studentRegs
      .map((r) => safeCourses.find((c) => c.id === r.courseId)?.name)
      .filter(Boolean)
      .join(', ');

    const balance = calculateStudentBalance(
      student.id,
      safeRegistrations,
      safeCourses,
      safePayments,
      courseFilterId || undefined
    );

    const contactStr = [student.phoneNumber, student.email].filter(Boolean).join('\n') || '-';

    return [
      (index + 1).toString(),
      `${student.firstName} ${student.lastName}`.toUpperCase(),
      contactStr,
      courseNames || 'Aucune',
      formatDate(student.registrationDate || student.createdAt),
      student.status === 'active' ? 'Actif' : 'Inactif',
      balance > 0 ? formatFCFA(balance) : 'Réglé',
    ];
  });

  autoTable(doc, {
    startY: startY + 20,
    head: [['#', 'Nom & Prénom', 'Contact', 'Formation(s)', 'Date Inscr.', 'Statut', 'Solde Dû']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 30, 30],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [22, 101, 52], // Emerald green
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 248],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 40 },
      3: { cellWidth: 38 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Colorize Solde Dû column
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw !== 'Réglé') {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        } else {
          data.cell.styles.textColor = [22, 101, 52]; // Green
        }
      }
      // Colorize Status column
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'Actif') {
          data.cell.styles.textColor = [22, 101, 52];
        } else {
          data.cell.styles.textColor = [120, 120, 120];
        }
      }
    },
  });

  addPageFooters(doc, centerInfo);

  const fileName = selectedCourse
    ? `liste_eleves_${selectedCourse.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.pdf`
    : `liste_eleves_${new Date().toISOString().split('T')[0]}.pdf`;

  doc.save(fileName);
};

/**
 * EXPORT 2: Rapport des Paiements & Financier en PDF
 */
export const exportPaymentsPDF = ({
  payments = [],
  students = [],
  courses = [],
  registrations = [],
  courseFilterId = '',
  searchQuery = '',
  activeTab = 'history',
  centerInfo,
}: {
  payments: (Payment & { id: string })[];
  students: (Student & { id: string })[];
  courses: Course[];
  registrations: any[];
  courseFilterId?: string;
  searchQuery?: string;
  activeTab?: 'history' | 'reminders';
  centerInfo?: CenterInfo;
}) => {
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeCourses = Array.isArray(courses) ? courses : [];
  const safeRegistrations = Array.isArray(registrations) ? registrations : [];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const selectedCourse = safeCourses.find((c) => c.id === courseFilterId);
  const isHistory = activeTab === 'history';

  const docTitle = isHistory
    ? 'RAPPORT DES ENCAISSEMENTS & PAIEMENTS'
    : 'RAPPORT DES BALANCES DUES & RELANCES';

  const subtitleParts = [];
  if (selectedCourse) subtitleParts.push(`Formation: ${selectedCourse.name}`);
  if (searchQuery) subtitleParts.push(`Recherche: "${searchQuery}"`);
  subtitleParts.push(`Mode: ${isHistory ? 'Historique des reçus' : 'Impayés & Rappels'}`);

  drawHeader(doc, docTitle, subtitleParts.join(' | '), centerInfo);

  let startY = 49;

  // Global KPIs
  const totalDueAll = safeStudents.reduce(
    (acc, s) => acc + Math.max(0, calculateStudentBalance(s.id, safeRegistrations, safeCourses, safePayments)),
    0
  );

  // Stats Box
  doc.setFillColor(249, 249, 247);
  doc.setDrawColor(229, 229, 224);
  doc.roundedRect(14, startY, 182, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  if (isHistory) {
    const pageTotal = safePayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    doc.setTextColor(22, 101, 52);
    doc.text(`Total Encaissé (Sélection): ${formatFCFA(pageTotal)}`, 20, startY + 10);
    doc.setTextColor(26, 26, 26);
    doc.text(`Nombre de règlements: ${safePayments.length}`, 95, startY + 10);
    doc.setTextColor(220, 38, 38);
    doc.text(`Reste à recouvrer (Centre): ${formatFCFA(totalDueAll)}`, 140, startY + 10);
  } else {
    // Reminders view
    const totalRemindersAmount = safeStudents.reduce((acc, s) => {
      const bal = calculateStudentBalance(s.id, safeRegistrations, safeCourses, safePayments, courseFilterId || undefined);
      return acc + (bal > 0 ? bal : 0);
    }, 0);

    doc.setTextColor(220, 38, 38);
    doc.text(`Total Impossessions Dues: ${formatFCFA(totalRemindersAmount)}`, 20, startY + 10);
    doc.setTextColor(26, 26, 26);
    doc.text(`Élèves en retard de paiement: ${safeStudents.filter(s => calculateStudentBalance(s.id, safeRegistrations, safeCourses, safePayments, courseFilterId || undefined) > 0).length}`, 110, startY + 10);
  }

  if (isHistory) {
    // Table 1: History of Payments
    const tableData = safePayments.map((p, index) => {
      const student = safeStudents.find((s) => s.id === p.studentId);
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu';
      const courseName = p.courseId ? safeCourses.find((c) => c.id === p.courseId)?.name || 'Paiement Global' : 'Paiement Global';
      const remaining = p.courseId && student ? calculateStudentBalance(student.id, safeRegistrations, safeCourses, safePayments, p.courseId) : null;

      const methodLabel = p.paymentMethod === 'cash' ? 'Espèces' : p.paymentMethod === 'wave' ? 'Wave' : p.paymentMethod === 'orange_money' ? 'Orange Money' : p.paymentMethod === 'transfer' ? 'Virement' : 'Chèque';

      return [
        (index + 1).toString(),
        formatDate(p.paymentDate),
        studentName,
        courseName,
        methodLabel,
        formatFCFA(p.amount),
        remaining !== null ? (remaining > 0 ? formatFCFA(remaining) : 'Solde réglé') : '-',
      ];
    });

    autoTable(doc, {
      startY: startY + 20,
      head: [['#', 'Date', 'Élève', 'Formation / Motif', 'Méthode', 'Montant Payé', 'Solde Restant']],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 3,
        textColor: [30, 30, 30],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [22, 101, 52],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 248],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 42, fontStyle: 'bold' },
        3: { cellWidth: 40 },
        4: { cellWidth: 24, halign: 'center' },
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 22, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          data.cell.styles.textColor = [22, 101, 52]; // Green for payment amount
        }
      },
    });
  } else {
    // Table 2: Reminders & Unpaid Balances
    const debtorStudents = safeStudents.filter((s) => {
      const bal = calculateStudentBalance(s.id, safeRegistrations, safeCourses, safePayments, courseFilterId || undefined);
      return bal > 0;
    });

    const tableData = debtorStudents.map((s, index) => {
      const totalBal = calculateStudentBalance(s.id, safeRegistrations, safeCourses, safePayments);
      const studentRegs = safeRegistrations.filter((r) => r.studentId === s.id);
      const coursesStr = studentRegs
        .map((r) => {
          const c = safeCourses.find((course) => course.id === r.courseId);
          const b = calculateStudentBalance(s.id, safeRegistrations, safeCourses, safePayments, r.courseId);
          return c ? `${c.name} (${formatFCFA(b)})` : '';
        })
        .filter(Boolean)
        .join(', ');

      const contactStr = [s.phoneNumber, s.email].filter(Boolean).join(' | ') || 'Non renseigné';

      return [
        (index + 1).toString(),
        `${s.firstName} ${s.lastName}`.toUpperCase(),
        contactStr,
        coursesStr || 'Toutes formations',
        formatFCFA(totalBal),
      ];
    });

    autoTable(doc, {
      startY: startY + 20,
      head: [['#', 'Élève', 'Contact', 'Détail par Formation (Reste Dû)', 'Total Dû']],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 3,
        textColor: [30, 30, 30],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [185, 28, 28], // Red for debt/reminders
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242], // light red tint
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45, fontStyle: 'bold' },
        2: { cellWidth: 45 },
        3: { cellWidth: 52 },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.textColor = [185, 28, 28]; // Red
        }
      },
    });
  }

  addPageFooters(doc, centerInfo);

  const filePrefix = isHistory ? 'rapport_encaissements' : 'rapport_impayes';
  const fileName = `${filePrefix}_${new Date().toISOString().split('T')[0]}.pdf`;

  doc.save(fileName);
};

/**
 * EXPORT 3: Bulletin de Notes Individuel
 */
export const exportStudentGradeReportPDF = ({
  student,
  course,
  grades = [],
  teacherName = '',
  centerInfo,
  period = '1er Trimestre',
  generalAppreciation = '',
  decision = ''
}: {
  student: Student & { id: string };
  course?: Course;
  grades: any[];
  teacherName?: string;
  centerInfo?: CenterInfo;
  period?: string;
  generalAppreciation?: string;
  decision?: string;
}) => {
  const activeCourse = course || { id: 'all', name: 'Toutes les formations', price: 0 };
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawHeader(doc, 'BULLETIN DE NOTES & BASSIN PÉDAGOGIQUE', `Période: ${period} | Élève: ${student.firstName} ${student.lastName}`, centerInfo);

  let startY = 48;

  // Student & Course Info Frame
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(14, startY, 182, 34, 3, 3, 'FD');

  // Student Photo if available
  const photoX = 18;
  const photoY = startY + 4;
  if (student.photoUrl && student.photoUrl.startsWith('data:image')) {
    try {
      const format = student.photoUrl.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(student.photoUrl, format, photoX, photoY, 20, 25);
    } catch {
      doc.setFillColor(229, 231, 235);
      doc.rect(photoX, photoY, 20, 25, 'F');
    }
  } else {
    doc.setFillColor(229, 231, 235);
    doc.rect(photoX, photoY, 20, 25, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${student.firstName[0] || ''}${student.lastName[0] || ''}`, photoX + 10, photoY + 15, { align: 'center' });
  }

  const textLeft = student.photoUrl ? 42 : 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59); // emerald-900
  doc.text(`ÉLÈVE : ${student.firstName.toUpperCase()} ${student.lastName.toUpperCase()}`, textLeft, startY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  doc.text(`Matricule: ${student.studentIdNumber || `STU-${student.id.slice(0, 5).toUpperCase()}`}`, textLeft, startY + 16);
  doc.text(`Téléphone: ${student.phoneNumber || 'N/A'}`, textLeft, startY + 22);
  doc.text(`Inscrit le: ${formatDate(student.registrationDate)}`, textLeft, startY + 28);

  doc.text(`Formation: ${activeCourse.name}`, 115, startY + 16);
  doc.text(`Période Scolaire: ${period}`, 115, startY + 22);
  doc.text(`Date d'Émission: ${new Date().toLocaleDateString('fr-FR')}`, 115, startY + 28);

  // Calculate Average
  const studentGrades = grades.filter(g => g.studentId === student.id && (activeCourse.id === 'all' || g.courseId === activeCourse.id));
  const totalWeight = studentGrades.reduce((acc, g) => acc + (Number(g.coefficient) || 1), 0);
  const weightedSum = studentGrades.reduce((acc, g) => {
    const val = Number(g.grade ?? g.score ?? 0);
    const max = Number(g.maxGrade || 20);
    const normalized = (val / max) * 20;
    return acc + (normalized * (Number(g.coefficient) || 1));
  }, 0);
  const average = totalWeight > 0 ? (weightedSum / totalWeight) : 0;

  const tableData = studentGrades.map((g, index) => [
    (index + 1).toString(),
    g.title || `Évaluation ${index + 1}`,
    formatDate(g.date),
    `${g.grade ?? g.score ?? 0} / ${g.maxGrade || 20}`,
    ((((g.grade ?? g.score ?? 0) / (g.maxGrade || 20)) * 20)).toFixed(2) + ' / 20',
    `x${g.coefficient || 1}`,
    g.comments || '-'
  ]);

  autoTable(doc, {
    startY: startY + 40,
    head: [['#', 'Évaluation / Examen', 'Date', 'Note Brute', 'Ramene /20', 'Coeff.', 'Observations du Professeur']],
    body: tableData.length > 0 ? tableData : [['-', 'Aucune note enregistrée', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 40 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 130;

  // General Average & Appreciation Frame
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, finalY + 6, 182, 36, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 78, 59);
  doc.text(`MOYENNE GÉNÉRALE : ${average.toFixed(2)} / 20`, 20, finalY + 16);

  let mention = 'Ajourné';
  if (average >= 16) mention = 'Très Bien (Excellence)';
  else if (average >= 14) mention = 'Bien (Félicitations)';
  else if (average >= 12) mention = 'Assez Bien (Encouragements)';
  else if (average >= 10) mention = 'Passable (Satisfaisant)';

  const finalDecision = decision || mention;

  doc.setFontSize(9.5);
  doc.setTextColor(217, 119, 6);
  doc.text(`Décision du Conseil : ${finalDecision}`, 110, finalY + 16);

  // General Appreciation Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Appréciation Générale de l'Équipe Pédagogique :`, 20, finalY + 25);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const appText = generalAppreciation || 'Élève assidu. Continuez ainsi dans le travail et l\'effort régulier.';
  const splitApp = doc.splitTextToSize(appText, 170);
  doc.text(splitApp, 20, finalY + 31);

  // Signatures Area
  const sigY = finalY + 54;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Signature du Formateur / Professeur', 20, sigY);
  doc.text('Le Directeur de l\'Établissement', 135, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('(Sceau & Signature officielle)', 135, sigY + 5);

  addPageFooters(doc, centerInfo);

  const fileName = `bulletin_${student.lastName.toLowerCase()}_${period.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(fileName);
};

/**
 * EXPORT 4: Certificat / Attestation de Formation Officiel
 */
export const exportStudentCertificatePDF = ({
  student,
  course,
  centerInfo,
}: {
  student: Student & { id: string };
  course: Course;
  centerInfo?: CenterInfo;
}) => {
  const centerName = centerInfo?.name || DEFAULT_CENTER_NAME;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Certificate Luxury Double Border
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(2);
  doc.rect(8, 8, 281, 194);

  doc.setDrawColor(200, 200, 190);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, 273, 186);

  // Header Title
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(centerName.toUpperCase(), 148, 30, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('ÉTABLISSEMENT DE FORMATION PROFESSIONNELLE & CONTINUE', 148, 38, { align: 'center' });

  // Certificate Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(26, 26, 26);
  doc.text('ATTESTATION DE FORMATION', 148, 62, { align: 'center' });

  // Body Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text('Le Directeur du centre certifie par la présente que :', 148, 78, { align: 'center' });

  // Student Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(22, 101, 52);
  doc.text(`${student.firstName} ${student.lastName}`.toUpperCase(), 148, 95, { align: 'center' });

  // Course Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text(`a suivi avec succès le programme de formation professionnelle intitulé :`, 148, 110, { align: 'center' });

  // Course Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 26);
  doc.text(`« ${course.name} »`, 148, 125, { align: 'center' });

  // Date and Registration
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Délivré pour servir et valoir ce que de droit, le ${dateStr}`, 148, 142, { align: 'center' });

  // Signatures & Stamp Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 26);
  doc.text('Le Formateur Référent', 50, 165);
  doc.text('Le Directeur Général', 220, 165, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('Cachet officiel et signature', 220, 171, { align: 'right' });

  const fileName = `attestation_${student.lastName.toLowerCase()}_${course.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(fileName);
};

/**
 * EXPORT 5: Fiche de Présence Imprimable
 */
export const exportAttendancePDF = ({
  course,
  date,
  students = [],
  records = [],
  centerInfo,
}: {
  course: Course;
  date: string;
  students: (Student & { id: string })[];
  records: any[];
  centerInfo?: CenterInfo;
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawHeader(doc, 'FICHE DE PRÉSENCE DU COURS', `Formation: ${course.name} | Date: ${formatDate(date)}`, centerInfo);

  let startY = 50;

  const tableData = students.map((s, index) => {
    const rec = records.find(r => r.studentId === s.id && r.date === date);
    const statusLabel = rec?.status === 'present' ? 'PRÉSENT' : rec?.status === 'absent' ? 'ABSENT' : rec?.status === 'late' ? 'EN RETARD' : 'NON RENSEIGNÉ';
    return [
      (index + 1).toString(),
      `${s.firstName} ${s.lastName}`.toUpperCase(),
      s.phoneNumber || '-',
      statusLabel,
      rec?.notes || '',
      '________________________' // Signature line
    ];
  });

  autoTable(doc, {
    startY: startY,
    head: [['#', 'Nom & Prénom', 'Téléphone', 'Statut', 'Remarques', 'Emargement Émargeur']],
    body: tableData,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3.5 },
    headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 45, fontStyle: 'bold' },
      2: { cellWidth: 30 },
      3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 35 },
      5: { cellWidth: 37, halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'PRÉSENT') data.cell.styles.textColor = [22, 101, 52];
        else if (data.cell.raw === 'ABSENT') data.cell.styles.textColor = [220, 38, 38];
        else if (data.cell.raw === 'EN RETARD') data.cell.styles.textColor = [217, 119, 6];
      }
    }
  });

  addPageFooters(doc, centerInfo);

  const fileName = `fiche_presence_${course.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${date}.pdf`;
  doc.save(fileName);
};

/**
 * Draw a single student card (badge) on a jsPDF canvas at position (ox, oy)
 */
const drawSingleStudentBadge = (
  doc: jsPDF,
  student: Student & { id: string },
  courseNames: string,
  ox: number,
  oy: number,
  centerInfo?: CenterInfo
) => {
  const cardW = 85.6;
  const cardH = 54;
  const centerTitle = (centerInfo?.name || DEFAULT_CENTER_NAME).toUpperCase();

  // Outer card background with soft border
  doc.setLineWidth(0.3);
  doc.setDrawColor(210, 214, 219);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(ox, oy, cardW, cardH, 3, 3, 'FD');

  // Subtle background security pattern (watermark grid)
  doc.setDrawColor(245, 247, 248);
  doc.setLineWidth(0.1);
  for (let i = 10; i < cardW; i += 8) {
    doc.line(ox + i, oy + 12, ox + i, oy + 47);
  }

  // Header Banner - Deep Emerald Green
  doc.setFillColor(6, 78, 59); // emerald-900
  doc.rect(ox, oy, cardW, 12.5, 'F');

  // Gold accent strip
  doc.setFillColor(217, 119, 6); // amber-600 gold
  doc.rect(ox, oy + 11.7, cardW, 0.8, 'F');

  // Header Center Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text(centerTitle.length > 28 ? centerTitle.substring(0, 28) + '...' : centerTitle, ox + 3.5, oy + 5.5);

  // Year Pill Badge
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(ox + cardW - 17, oy + 2, 14, 4, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(255, 255, 255);
  doc.text("2025-2026", ox + cardW - 10, oy + 4.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(209, 250, 229);
  doc.text("CARTE D'ÉLÈVE SCOLAIRE OFFICIELLE", ox + 3.5, oy + 9.5);

  // Photo Frame
  const photoX = ox + 4;
  const photoY = oy + 15;
  const photoW = 22;
  const photoH = 26;

  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(180, 185, 190);
  doc.setLineWidth(0.3);
  doc.rect(photoX, photoY, photoW, photoH, 'FD');

  if (student.photoUrl && student.photoUrl.startsWith('data:image')) {
    try {
      const format = student.photoUrl.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(student.photoUrl, format, photoX, photoY, photoW, photoH);
    } catch {
      doc.setFillColor(209, 213, 219);
      doc.circle(photoX + 11, photoY + 10, 5, 'F');
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(`${student.firstName[0] || ''}${student.lastName[0] || ''}`, photoX + 11, photoY + 20, { align: 'center' });
    }
  } else {
    doc.setFillColor(229, 231, 235);
    doc.circle(photoX + 11, photoY + 9, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text(`${student.firstName[0] || ''}${student.lastName[0] || ''}`, photoX + 11, photoY + 19, { align: 'center' });
  }

  // Matricule badge under photo
  const matricule = student.studentIdNumber || `KG-${student.id.slice(0, 5).toUpperCase()}`;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.rect(photoX, photoY + photoH + 1, photoW, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(6, 78, 59);
  doc.text(matricule, photoX + (photoW / 2), photoY + photoH + 4, { align: 'center' });

  // Student Information
  const infoX = ox + 29;
  let textY = oy + 17;

  // Full Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  const fullName = `${student.firstName} ${student.lastName.toUpperCase()}`;
  doc.text(fullName.length > 24 ? fullName.substring(0, 24) + '.' : fullName, infoX, textY);

  textY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Inscrit(e) en :", infoX, textY);

  textY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 78, 59);
  const displayCourses = courseNames || 'Formation Générale';
  doc.text(displayCourses.length > 30 ? displayCourses.substring(0, 30) + '...' : displayCourses, infoX, textY);

  textY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Téléphone :", infoX, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(student.phoneNumber || 'N/A', infoX + 16, textY);

  if (student.emergencyContact) {
    textY += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(107, 114, 128);
    doc.text("Urg. Parent :", infoX, textY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(student.emergencyContact, infoX + 16, textY);
  }

  textY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Inscrit le :", infoX, textY);
  doc.text(formatDate(student.registrationDate), infoX + 16, textY);

  // Simulated Barcode Graphic on bottom right
  const barcodeX = ox + cardW - 22;
  const barcodeY = oy + 38;
  doc.setFillColor(31, 41, 55);
  const barWidths = [0.4, 0.2, 0.6, 0.3, 0.8, 0.2, 0.5, 0.3, 0.6, 0.4, 0.2, 0.7, 0.3];
  let currentBx = barcodeX;
  barWidths.forEach(w => {
    doc.rect(currentBx, barcodeY, w, 7, 'F');
    currentBx += w + 0.3;
  });

  // Footer strip
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(229, 231, 235);
  doc.rect(ox, oy + 47, cardW, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(107, 114, 128);
  doc.text("CARTE STRICTEMENT PERSONNELLE • ÉTABLISSEMENT HOMOLOGUÉ", ox + (cardW / 2), oy + 51.5, { align: 'center' });
};

/**
 * Draw a single teacher card (badge enseignant) on a jsPDF canvas at position (ox, oy)
 */
const drawSingleTeacherBadge = (
  doc: jsPDF,
  teacher: Teacher & { id: string },
  ox: number,
  oy: number,
  centerInfo?: CenterInfo
) => {
  const cardW = 85.6;
  const cardH = 54;
  const centerTitle = (centerInfo?.name || DEFAULT_CENTER_NAME).toUpperCase();

  // Outer card background with soft border
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(ox, oy, cardW, cardH, 3, 3, 'FD');

  // Subtle background pattern (navy/slate security stripes)
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.1);
  for (let i = 10; i < cardW; i += 8) {
    doc.line(ox + i, oy + 12, ox + i, oy + 47);
  }

  // Header Banner - Executive Dark Slate/Navy
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(ox, oy, cardW, 12.5, 'F');

  // Premium Gold accent line
  doc.setFillColor(217, 119, 6); // amber-600 gold
  doc.rect(ox, oy + 11.7, cardW, 0.8, 'F');

  // Header Center Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text(centerTitle.length > 28 ? centerTitle.substring(0, 28) + '...' : centerTitle, ox + 3.5, oy + 5.5);

  // Status Gold Pill Badge
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(ox + cardW - 20, oy + 2, 17, 4, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(255, 255, 255);
  doc.text("ENSEIGNANT", ox + cardW - 11.5, oy + 4.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(254, 243, 199); // amber-100
  doc.text("BADGE PROFESSIONNEL & DE SERVICE", ox + 3.5, oy + 9.5);

  // Photo Frame
  const photoX = ox + 4;
  const photoY = oy + 15;
  const photoW = 22;
  const photoH = 26;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(photoX, photoY, photoW, photoH, 'FD');

  if (teacher.photoUrl && teacher.photoUrl.startsWith('data:image')) {
    try {
      const format = teacher.photoUrl.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(teacher.photoUrl, format, photoX, photoY, photoW, photoH);
    } catch {
      doc.setFillColor(226, 232, 240);
      doc.circle(photoX + 11, photoY + 10, 5, 'F');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`${teacher.firstName[0] || ''}${teacher.lastName[0] || ''}`, photoX + 11, photoY + 20, { align: 'center' });
    }
  } else {
    doc.setFillColor(226, 232, 240);
    doc.circle(photoX + 11, photoY + 9, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${teacher.firstName[0] || ''}${teacher.lastName[0] || ''}`, photoX + 11, photoY + 19, { align: 'center' });
  }

  // Teacher ID / Matricule tag
  const teacherId = teacher.teacherIdNumber || `ENS-${teacher.id.slice(0, 5).toUpperCase()}`;
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(252, 211, 77);
  doc.rect(photoX, photoY + photoH + 1, photoW, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(teacherId, photoX + (photoW / 2), photoY + photoH + 4, { align: 'center' });

  // Teacher Information
  const infoX = ox + 29;
  let textY = oy + 17;

  // Full Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const fullName = `${teacher.firstName} ${teacher.lastName.toUpperCase()}`;
  doc.text(fullName.length > 24 ? fullName.substring(0, 24) + '.' : fullName, infoX, textY);

  textY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Discipline / Spécialité :", infoX, textY);

  textY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 83, 9);
  const specialtyText = teacher.specialty || 'Formateur Général';
  doc.text(specialtyText.length > 30 ? specialtyText.substring(0, 30) + '...' : specialtyText, infoX, textY);

  textY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Téléphone :", infoX, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(teacher.phoneNumber || 'N/A', infoX + 16, textY);

  if (teacher.email) {
    textY += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Email :", infoX, textY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(teacher.email.length > 22 ? teacher.email.substring(0, 22) + '...' : teacher.email, infoX + 16, textY);
  }

  // Simulated Barcode Graphic
  const barcodeX = ox + cardW - 22;
  const barcodeY = oy + 38;
  doc.setFillColor(15, 23, 42);
  const barWidths = [0.5, 0.2, 0.7, 0.3, 0.4, 0.2, 0.8, 0.3, 0.5, 0.3, 0.2, 0.6];
  let currentBx = barcodeX;
  barWidths.forEach(w => {
    doc.rect(currentBx, barcodeY, w, 7, 'F');
    currentBx += w + 0.3;
  });

  // Footer strip
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.rect(ox, oy + 47, cardW, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(71, 85, 105);
  doc.text("CARTE DE SERVICE OFFICIELLE • ACCÈS AUTORISÉ AU CENTRE", ox + (cardW / 2), oy + 51.5, { align: 'center' });
};

/**
 * Export single student card PDF (Landscape CR80 badge)
 */
export const exportStudentCardPDF = ({
  student,
  courseNames,
  centerInfo
}: {
  student: Student & { id: string };
  courseNames: string;
  centerInfo?: CenterInfo;
}) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 54]
  });

  drawSingleStudentBadge(doc, student, courseNames, 0, 0, centerInfo);

  const fileName = `carte_scolaire_${student.firstName}_${student.lastName}.pdf`.toLowerCase().replace(/\s+/g, '_');
  doc.save(fileName);
};

/**
 * Export single teacher card PDF (Landscape CR80 badge)
 */
export const exportTeacherCardPDF = ({
  teacher,
  centerInfo
}: {
  teacher: Teacher & { id: string };
  centerInfo?: CenterInfo;
}) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 54]
  });

  drawSingleTeacherBadge(doc, teacher, 0, 0, centerInfo);

  const fileName = `carte_prof_${teacher.firstName}_${teacher.lastName}.pdf`.toLowerCase().replace(/\s+/g, '_');
  doc.save(fileName);
};

/**
 * Export Batch Student Cards PDF (8 cards per A4 sheet)
 */
export const exportBatchStudentCardsPDF = ({
  students,
  courses,
  registrations,
  centerInfo
}: {
  students: (Student & { id: string })[];
  courses: Course[];
  registrations: any[];
  centerInfo?: CenterInfo;
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const cardW = 85.6;
  const cardH = 54;
  const startX = 14;
  const startY = 12;
  const gapX = 10;
  const gapY = 12;

  let count = 0;

  students.forEach((student) => {
    if (count > 0 && count % 8 === 0) {
      doc.addPage();
    }

    const posInPage = count % 8;
    const col = posInPage % 2; // 0 or 1
    const row = Math.floor(posInPage / 2); // 0, 1, 2, 3

    const ox = startX + col * (cardW + gapX);
    const oy = startY + row * (cardH + gapY);

    const studentRegs = (registrations || []).filter((r: any) => r.studentId === student.id);
    const courseNames = studentRegs
      .map((r: any) => courses.find((c) => c.id === r.courseId)?.name)
      .filter(Boolean)
      .join(', ');

    drawSingleStudentBadge(doc, student, courseNames, ox, oy, centerInfo);

    // Cutting lines marker
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(ox - 0.5, oy - 0.5, cardW + 1, cardH + 1);
    doc.setLineDashPattern([], 0);

    count++;
  });

  doc.save(`cartes_scolaires_lot_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export Batch Teacher Cards PDF (8 cards per A4 sheet)
 */
export const exportBatchTeacherCardsPDF = ({
  teachers,
  centerInfo
}: {
  teachers: (Teacher & { id: string })[];
  centerInfo?: CenterInfo;
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const cardW = 85.6;
  const cardH = 54;
  const startX = 14;
  const startY = 12;
  const gapX = 10;
  const gapY = 12;

  let count = 0;

  teachers.forEach((teacher) => {
    if (count > 0 && count % 8 === 0) {
      doc.addPage();
    }

    const posInPage = count % 8;
    const col = posInPage % 2;
    const row = Math.floor(posInPage / 2);

    const ox = startX + col * (cardW + gapX);
    const oy = startY + row * (cardH + gapY);

    drawSingleTeacherBadge(doc, teacher, ox, oy, centerInfo);

    // Cutting lines marker
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(ox - 0.5, oy - 0.5, cardW + 1, cardH + 1);
    doc.setLineDashPattern([], 0);

    count++;
  });

  doc.save(`cartes_pro_enseignants_lot_${new Date().toISOString().split('T')[0]}.pdf`);
};


