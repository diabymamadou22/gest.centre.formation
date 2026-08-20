import React, { useState } from 'react';
import { Payment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Printer, X, Trash2, Ticket, FileText, CheckCircle2, Landmark, ShieldCheck, Send, Phone, Smartphone, MessageSquare } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface InvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  payment: (Payment & { id: string }) | null;
  studentName: string;
  courseName: string;
  balance: number;
  studentPhoneNumber?: string;
  emergencyContact?: string;
  onDelete?: (payment: Payment & { id: string }) => void;
  centerSettings: {
    name: string;
    logo: string;
  };
}

// Helper to convert number to French words for Postal Receipts
function numberToWordsFR(num: number): string {
  if (!num || num <= 0) return 'Zéro Franc CFA';
  
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) {
      if (n === 71) return 'soixante-et-onze';
      if (n === 70) return 'soixante-dix';
      if (n > 70 && n < 80) return `soixante-${units[n - 60]}`;
      if (n === 81) return 'quatre-vingt-un';
      if (n === 80) return 'quatre-vingts';
      if (n > 80 && n < 90) return `quatre-vingt-${units[n - 80]}`;
      if (n === 91) return 'quatre-vingt-onze';
      if (n === 90) return 'quatre-vingt-dix';
      if (n > 90 && n < 100) return `quatre-vingt-${units[n - 80]}`;
      const ten = Math.floor(n / 10);
      const rest = n % 10;
      return rest === 1 ? `${tens[ten]}-et-un` : rest > 0 ? `${tens[ten]}-${units[rest]}` : tens[ten];
    }
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const hStr = hundred === 1 ? 'cent' : `${units[hundred]} cents`;
    return rest > 0 ? `${hundred === 1 ? 'cent' : units[hundred] + ' cent'} ${convertGroup(rest)}` : hStr;
  }

  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const mStr = millions === 1 ? 'un million' : `${convertGroup(millions)} millions`;
    return rest > 0 ? `${mStr} ${numberToWordsFR(rest)}` : `${mStr} Francs CFA`;
  }

  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    const rest = num % 1000;
    const tStr = thousands === 1 ? 'mille' : `${convertGroup(thousands)} mille`;
    const restStr = rest > 0 ? convertGroup(rest) : '';
    const full = restStr ? `${tStr} ${restStr}` : tStr;
    const capitalized = full.charAt(0).toUpperCase() + full.slice(1);
    return `${capitalized} Francs CFA`;
  }

  const res = convertGroup(num);
  const capitalized = res.charAt(0).toUpperCase() + res.slice(1);
  return `${capitalized} Francs CFA`;
}

export const Invoice: React.FC<InvoiceProps> = ({
  isOpen,
  onClose,
  payment,
  studentName,
  courseName,
  balance,
  studentPhoneNumber,
  emergencyContact,
  onDelete,
  centerSettings
}) => {
  const [receiptFormat, setReceiptFormat] = useState<'a4' | 'ticket' | 'postal'>('a4');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [targetPhone, setTargetPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  if (!isOpen || !payment) return null;

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'ESPÈCES';
      case 'wave': return 'WAVE';
      case 'orange_money': return 'ORANGE MONEY';
      case 'transfer': return 'VIREMENT / MOBILE';
      case 'check': return 'CHÈQUE';
      default: return method.toUpperCase();
    }
  };

  const handleOpenWhatsAppModal = () => {
    if (!payment) return;
    const initialPhone = studentPhoneNumber || emergencyContact || '';
    setTargetPhone(initialPhone);

    const defaultMsg = `📄 *REÇU DE PAIEMENT - ${centerSettings.name}*\n` +
      `----------------------------------\n` +
      `🔹 *N° Reçu* : ${payment.id.substring(0, 8).toUpperCase()}\n` +
      `👤 *Élève* : ${studentName}\n` +
      `📅 *Date* : ${payment.paymentDate}\n` +
      `${courseName ? `📚 *Formation* : ${courseName}\n` : ''}` +
      `💵 *Montant Versé* : ${payment.amount.toLocaleString()} FCFA\n` +
      `💳 *Mode de Règlement* : ${getMethodLabel(payment.paymentMethod)}${payment.referenceNumber ? ` (Réf: ${payment.referenceNumber})` : ''}\n` +
      `----------------------------------\n` +
      `${balance > 0 ? `⚠️ *Reste à Payer* : ${balance.toLocaleString()} FCFA` : `✅ *Statut* : SOLDE RÉGLÉ (0 FCFA)`}\n` +
      `----------------------------------\n` +
      `Merci pour votre confiance !\n` +
      `La direction, ${centerSettings.name}`;

    setCustomMessage(defaultMsg);
    setIsWhatsAppModalOpen(true);
  };

  const handleSendWhatsApp = () => {
    if (!targetPhone || !targetPhone.trim()) {
      toast.error("Veuillez saisir un numéro de téléphone WhatsApp valide.");
      return;
    }
    const cleanPhone = targetPhone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 6) {
      toast.error("Le numéro de téléphone saisi semble invalide.");
      return;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank');
    toast.success("Redirection vers WhatsApp...");
    setIsWhatsAppModalOpen(false);
  };

  const handleDownloadA4 = async () => {
    try {
      const doc = new jsPDF();
      
      const addImageToDoc = (url: string): Promise<void> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = url || "/input_file_0.png";
          
          const timeout = setTimeout(() => {
            console.warn('Image loading timed out');
            resolve();
          }, 3000);

          img.onload = () => {
            clearTimeout(timeout);
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                const aspectRatio = img.width / img.height;
                const width = aspectRatio > 1 ? 40 : 25;
                const height = width / aspectRatio;
                doc.addImage(dataURL, 'PNG', 20, 10, width, height);
              }
            } catch (e) {
              console.error('Canvas error:', e);
            }
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            console.error('Image loading error for url:', url);
            resolve();
          };
        });
      };

      await addImageToDoc(centerSettings.logo);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(5, 150, 105);
      doc.text(centerSettings.name.toUpperCase(), 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('REÇU DE PAIEMENT OFFICIEL', 105, 38, { align: 'center' });
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 45, 190, 45);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Reçu N°: ${payment.id.substring(0, 8).toUpperCase()}`, 20, 55);
      doc.text(`Date: ${payment.paymentDate}`, 20, 62);
      doc.text(`Émis le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 69);

      const tableData = [
        ['Élève', studentName],
        ['ID Élève', payment.studentId.substring(0, 8).toUpperCase()],
        ['Cours', courseName || 'Frais Généraux'],
        ['Description', payment.description || 'Frais de formation'],
        ['Méthode', getMethodLabel(payment.paymentMethod)],
        ['Référence', payment.referenceNumber || 'N/A'],
        ['Montant Payé', `${payment.amount.toLocaleString()} FCFA`],
        ['Reste à payer', `${balance.toLocaleString()} FCFA`],
      ];

      autoTable(doc, {
        startY: 80,
        head: [['LIBELLÉ', 'VALEUR']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 25;
      doc.setFontSize(10);
      doc.text('Signature Elève:', 20, finalY);
      doc.text('Cachet et Signature Direction:', 120, finalY);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Document certifié par kalan gest KG.`, 105, 285, { align: 'center' });

      doc.save(`Facture_${studentName.replace(/\s+/g, '_')}_${payment.id.substring(0, 8)}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    }
  };

  const handleDownloadTicket = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 160]
      });

      const addImageToDoc = (url: string): Promise<void> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = url || "/input_file_0.png";
          
          const timeout = setTimeout(() => { resolve(); }, 2500);

          img.onload = () => {
            clearTimeout(timeout);
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                doc.addImage(dataURL, 'PNG', 32, 6, 16, 16);
              }
            } catch (e) {
              console.error('Canvas error:', e);
            }
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
      };

      if (centerSettings.logo) {
        await addImageToDoc(centerSettings.logo);
      }

      let y = centerSettings.logo ? 26 : 12;

      doc.setFont('Courier', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(centerSettings.name.toUpperCase(), 40, y, { align: 'center' });

      y += 5;
      doc.setFontSize(8);
      doc.setFont('Courier', 'normal');
      doc.text('*** TICKET DE PAIEMENT ***', 40, y, { align: 'center' });

      y += 4;
      doc.text('- - - - - - - - - - - - - - - - - - - - - - - -', 40, y, { align: 'center' });

      y += 5;
      doc.setFontSize(7.5);
      doc.text(`N° REÇU: ${payment.id.substring(0, 8).toUpperCase()}`, 6, y);
      y += 4;
      doc.text(`DATE   : ${payment.paymentDate}`, 6, y);
      y += 4;
      doc.text(`ÉLÈVE  : ${studentName}`, 6, y);
      y += 4;
      doc.text(`ID     : ${payment.studentId.substring(0, 8).toUpperCase()}`, 6, y);

      y += 3;
      doc.text('- - - - - - - - - - - - - - - - - - - - - - - -', 40, y, { align: 'center' });

      y += 5;
      if (courseName) {
        doc.text(`COURS  : ${courseName}`, 6, y);
        y += 4;
      }
      doc.text(`MODE   : ${getMethodLabel(payment.paymentMethod)}`, 6, y);
      if (payment.referenceNumber) {
        y += 4;
        doc.text(`RÉF    : ${payment.referenceNumber}`, 6, y);
      }

      y += 4;
      doc.text('- - - - - - - - - - - - - - - - - - - - - - - -', 40, y, { align: 'center' });

      y += 6;
      doc.setFontSize(9);
      doc.setFont('Courier', 'bold');
      doc.text('MONTANT VERSÉ:', 6, y);
      y += 6;
      doc.setFontSize(13);
      doc.text(`${payment.amount.toLocaleString()} FCFA`, 40, y, { align: 'center' });

      y += 5;
      doc.setFontSize(8);
      doc.setFont('Courier', 'normal');
      doc.text('- - - - - - - - - - - - - - - - - - - - - - - -', 40, y, { align: 'center' });

      y += 5;
      if (balance > 0) {
        doc.text(`SOLDE RESTANT DÛ : ${balance.toLocaleString()} FCFA`, 6, y);
      } else {
        doc.setFont('Courier', 'bold');
        doc.text('STATUT : SOLDE RÉGLÉ (SOLDÉ)', 40, y, { align: 'center' });
      }

      y += 8;
      doc.setFont('Courier', 'normal');
      doc.setFontSize(7);
      doc.text('Merci de conserver ce ticket.', 40, y, { align: 'center' });
      y += 4;
      doc.text(`kalan gest KG - ${new Date().toLocaleDateString('fr-FR')}`, 40, y, { align: 'center' });

      doc.save(`Ticket_${studentName.replace(/\s+/g, '_')}_${payment.id.substring(0, 8)}.pdf`);
    } catch (err) {
      console.error('Ticket PDF Error:', err);
      alert('Erreur lors de la génération du ticket PDF.');
    }
  };

  const handleDownloadPostal = async () => {
    try {
      const doc = new jsPDF();
      
      // Outer border for Postal Receipt
      doc.setDrawColor(20, 83, 45);
      doc.setLineWidth(0.8);
      doc.rect(10, 10, 190, 135);
      doc.rect(12, 12, 186, 131);

      // Header Banner
      doc.setFillColor(20, 83, 45);
      doc.rect(12, 12, 186, 18, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('REÇU DE CAISSE POSTALE ET MANDAT D\'ENCAISSEMENT', 105, 22, { align: 'center' });
      doc.setFontSize(8);
      doc.text(centerSettings.name.toUpperCase(), 105, 27, { align: 'center' });

      // Details Grid
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`N° RÉCÉPISSÉ : POST-${payment.id.substring(0, 8).toUpperCase()}`, 16, 38);
      doc.text(`DATE D'ÉMISSION : ${payment.paymentDate}`, 130, 38);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(16, 42, 194, 42);

      let y = 49;
      doc.setFont('helvetica', 'normal');
      doc.text('Reçu de M. / Mme / Mlle :', 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(studentName.toUpperCase(), 65, y);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text('Identifiant / Matricule :', 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(payment.studentId.substring(0, 8).toUpperCase(), 65, y);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text('Montant reçu (en chiffres) :', 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${payment.amount.toLocaleString()} FCFA`, 65, y);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text('Montant (en toutes lettres) :', 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(numberToWordsFR(payment.amount), 65, y);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text('Motif / Objet du Versement :', 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(courseName ? `Formation : ${courseName}` : (payment.description || 'Frais de scolarité'), 65, y);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text('Mode de Règlement :', 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${getMethodLabel(payment.paymentMethod)} ${payment.referenceNumber ? '(Réf: ' + payment.referenceNumber + ')' : ''}`, 65, y);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text('Situation du Solde :', 16, y);
      doc.setFont('helvetica', 'bold');
      if (balance > 0) {
        doc.setTextColor(180, 83, 9);
        doc.text(`Reste à Payer : ${balance.toLocaleString()} FCFA`, 65, y);
      } else {
        doc.setTextColor(22, 101, 52);
        doc.text('SOLDE RÉGLÉ (SITUATION SOLDÉE)', 65, y);
      }

      doc.setTextColor(0, 0, 0);
      y += 10;
      doc.line(16, y, 194, y);

      // Signatures & Stamp area
      y += 8;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Signature du Mandant / Élève', 25, y);
      doc.text('Timbre Postal & Cachet du Caissier', 125, y);

      // Box for postal stamp
      doc.setDrawColor(22, 101, 52);
      doc.setLineWidth(0.5);
      doc.rect(120, y + 4, 65, 25);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Valide avec cachet humide', 152.5, y + 17, { align: 'center' });

      doc.save(`Recu_Poste_${studentName.replace(/\s+/g, '_')}_${payment.id.substring(0, 8)}.pdf`);
    } catch (err) {
      console.error('Postal PDF Error:', err);
      alert('Erreur lors de la génération du reçu postal PDF.');
    }
  };

  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error('Print error:', err);
      toast.info("Génération du document PDF pour impression...");
      if (receiptFormat === 'a4') handleDownloadA4();
      else if (receiptFormat === 'ticket') handleDownloadTicket();
      else handleDownloadPostal();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl h-[90vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-[#F0F0EE] bg-white sticky top-0 z-10 gap-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                Reçu N° {payment.id.substring(0, 8).toUpperCase()}
              </h3>
              <p className="text-[11px] text-[#8E9299]">Choisissez le format d'impression approprié</p>
            </div>

            {/* Format Selector Tabs */}
            <div className="flex items-center gap-1 bg-[#F5F5F0] p-1 rounded-2xl flex-wrap">
              <button
                onClick={() => setReceiptFormat('a4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  receiptFormat === 'a4' 
                    ? 'bg-white text-emerald-900 shadow-sm' 
                    : 'text-[#8E9299] hover:text-[#1A1A1A]'
                }`}
              >
                <FileText size={14} />
                Grand Format A4
              </button>
              <button
                onClick={() => setReceiptFormat('ticket')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  receiptFormat === 'ticket' 
                    ? 'bg-white text-emerald-900 shadow-sm' 
                    : 'text-[#8E9299] hover:text-[#1A1A1A]'
                }`}
              >
                <Ticket size={14} />
                Petit Ticket (80mm)
              </button>
              <button
                onClick={() => setReceiptFormat('postal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  receiptFormat === 'postal' 
                    ? 'bg-white text-emerald-900 shadow-sm' 
                    : 'text-[#8E9299] hover:text-[#1A1A1A]'
                }`}
              >
                <Landmark size={14} />
                Reçu de Poste
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap sm:flex-nowrap">
              <button
                onClick={handleOpenWhatsAppModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] text-white hover:bg-[#20bd5a] rounded-xl text-xs font-bold uppercase transition-all shadow-sm active:scale-95"
                title="Envoyer le reçu au parent par WhatsApp"
              >
                <Send size={14} />
                WhatsApp
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F9F9F7] text-[#1A1A1A] border border-[#E5E5E0] rounded-xl text-xs font-bold uppercase transition-all hover:bg-[#F0F0EE] active:scale-95"
                title="Imprimer au format sélectionné"
              >
                <Printer size={14} />
                Imprimer
              </button>
              <button
                onClick={
                  receiptFormat === 'a4' ? handleDownloadA4 :
                  receiptFormat === 'ticket' ? handleDownloadTicket :
                  handleDownloadPostal
                }
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase transition-all hover:bg-emerald-950 active:scale-95"
                title="Télécharger en PDF"
              >
                <Download size={14} />
                PDF
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(payment)}
                  className="p-2 text-[#8E9299] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Supprimer la facture"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-[#8E9299] hover:bg-gray-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Content Preview */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-[#F4F4F0] flex justify-center items-start">
            
            {/* Format 1: Grand Format A4 Standard */}
            {receiptFormat === 'a4' && (
              <div id="printable-receipt-area" className="bg-white rounded-[2.5rem] shadow-sm border border-[#E5E5E0] p-8 lg:p-12 w-full max-w-xl mx-auto print:shadow-none print:border-none">
                <div className="flex justify-between items-start mb-10">
                  <div className="w-20 h-20 bg-[#F9F9F7] rounded-3xl border border-[#E5E5E0] p-3 flex items-center justify-center overflow-hidden">
                    <img 
                      src={centerSettings.logo || "/input_file_0.png"} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-right">
                    <h4 className="text-xl font-serif font-bold text-emerald-900">{centerSettings.name}</h4>
                    <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mt-1 font-bold">kalan gest KG</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10 text-left">
                  <div>
                    <p className="text-[10px] text-[#8E9299] uppercase font-bold tracking-widest mb-2">Facturé à</p>
                    <p className="text-sm font-bold text-[#1A1A1A]">{studentName}</p>
                    <p className="text-xs text-[#8E9299] mt-1">Élève ID: {payment.studentId.substring(0, 8).toUpperCase()}</p>
                    {courseName && (
                      <p className="text-xs text-emerald-700 font-bold mt-2">Cours: {courseName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#8E9299] uppercase font-bold tracking-widest mb-2">Détails</p>
                    <p className="text-xs text-[#1A1A1A] font-medium">Date: {payment.paymentDate}</p>
                    <p className="text-xs text-[#1A1A1A] font-medium mt-1">Méthode: {getMethodLabel(payment.paymentMethod)}</p>
                    {payment.referenceNumber && (
                      <p className="text-xs text-emerald-800 font-medium mt-1">Réf: {payment.referenceNumber}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-b border-[#F0F0EE] py-6 mb-10">
                  <div className="flex justify-between items-center mb-4 text-[10px] text-[#8E9299] uppercase font-bold tracking-widest">
                    <span>Description</span>
                    <span>Montant</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#1A1A1A] font-medium">{payment.description || 'Frais de formation du centre'}</span>
                    <span className="text-emerald-900 font-bold">{payment.amount.toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="mb-10">
                   <div className="flex justify-between items-end">
                     <div className="text-left">
                       <p className="text-[10px] text-[#8E9299] uppercase font-bold tracking-widest mb-3">Statut du dossier</p>
                       <div className="flex flex-col gap-1.5">
                         {balance > 0 ? (
                           <>
                             <span className="inline-flex px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase rounded-full border border-amber-200">Solde Partiel</span>
                             <p className="text-[11px] text-[#8E9299]">Reste à payer: <span className="text-amber-700 font-bold">{balance.toLocaleString()} FCFA</span></p>
                           </>
                         ) : (
                           <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-full border border-emerald-200">Solde Réglé (Soldé)</span>
                         )}
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] text-[#8E9299] uppercase font-bold tracking-widest mb-1">Total Payé</p>
                       <p className="text-3xl font-serif font-bold text-emerald-900">{payment.amount.toLocaleString()} FCFA</p>
                     </div>
                   </div>
                </div>

                <div className="pt-12 text-center">
                  <div className="w-32 h-[1px] bg-[#F0F0EE] mx-auto mb-3"></div>
                  <p className="text-[9px] text-[#8E9299] uppercase tracking-wider">Merci de votre confiance • kalan gest KG</p>
                </div>
              </div>
            )}

            {/* Format 2: Petit Ticket de Caisse Thermique (80mm) */}
            {receiptFormat === 'ticket' && (
              <div id="printable-receipt-area" className="ticket-print-mode w-full max-w-[320px] bg-white rounded-2xl shadow-xl border border-gray-200 p-6 text-left font-mono text-xs text-gray-900 relative">
                {/* Paper Top Jagged Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 rounded-t-2xl"></div>

                {/* Header Center */}
                <div className="text-center pt-2 pb-3 border-b-2 border-dashed border-gray-300">
                  {centerSettings.logo && (
                    <img 
                      src={centerSettings.logo} 
                      alt="Logo" 
                      className="w-12 h-12 object-contain mx-auto mb-2"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <h4 className="font-bold text-sm tracking-tight text-black uppercase">{centerSettings.name}</h4>
                  <p className="text-[10px] text-gray-500 uppercase mt-0.5 font-bold">*** TICKET DE PAIEMENT ***</p>
                </div>

                {/* Receipt Details */}
                <div className="py-3 border-b-2 border-dashed border-gray-300 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">N° Reçu:</span>
                    <span className="font-bold font-mono">{payment.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span>{payment.paymentDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Élève:</span>
                    <span className="font-bold text-gray-900 truncate max-w-[170px]">{studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID Élève:</span>
                    <span className="font-mono text-[10px]">{payment.studentId.substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                {/* Course & Payment Details */}
                <div className="py-3 border-b-2 border-dashed border-gray-300 space-y-1.5 text-[11px]">
                  {courseName && (
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">Formation:</span>
                      <span className="font-bold text-emerald-900">{courseName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Méthode:</span>
                    <span className="font-bold">{getMethodLabel(payment.paymentMethod)}</span>
                  </div>
                  {payment.referenceNumber && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">Réf:</span>
                      <span className="font-mono">{payment.referenceNumber}</span>
                    </div>
                  )}
                </div>

                {/* Main Payment Amount */}
                <div className="py-4 text-center my-1 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Montant Versé</p>
                  <p className="text-2xl font-black text-emerald-950 mt-0.5">{payment.amount.toLocaleString()} FCFA</p>
                </div>

                {/* Balance Status */}
                <div className="py-3 border-b-2 border-dashed border-gray-300 text-[11px]">
                  {balance > 0 ? (
                    <div className="flex justify-between items-center text-amber-800 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <span>Reste à Payer:</span>
                      <span>{balance.toLocaleString()} FCFA</span>
                    </div>
                  ) : (
                    <div className="text-center font-bold text-emerald-800 bg-emerald-100/70 p-2 rounded-lg flex items-center justify-center gap-1">
                      <CheckCircle2 size={14} />
                      <span>SOLDE ENTIÈREMENT RÉGLÉ</span>
                    </div>
                  )}
                </div>

                {/* Footer Barcode / QR Simulation & Note */}
                <div className="pt-4 text-center space-y-2">
                  <div className="flex justify-center gap-1 opacity-70 my-1">
                    {/* Simulated barcode lines */}
                    {[12, 24, 8, 16, 28, 10, 18, 24, 14, 20, 8, 16, 22, 10, 18, 26, 12, 20].map((h, idx) => (
                      <div key={idx} className="bg-black w-1" style={{ height: `${h}px` }} />
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-tighter">
                    Merci de conserver ce ticket de caisse
                  </p>
                  <p className="text-[8px] text-gray-400 font-bold">
                    kalan gest KG • {new Date().toLocaleDateString('fr-FR')}
                  </p>
                </div>

              </div>
            )}

            {/* Format 3: Reçu de Poste / Mandat Officiel de Caisse */}
            {receiptFormat === 'postal' && (
              <div id="printable-receipt-area" className="w-full max-w-xl bg-white rounded-3xl shadow-lg border-2 border-emerald-900/20 p-6 lg:p-8 text-left text-xs text-gray-900 relative overflow-hidden">
                {/* Official Stamp Top Badge */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-emerald-900/80 pb-4 mb-6 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-900 text-white rounded-2xl flex items-center justify-center font-bold shadow-md shrink-0">
                      <Landmark size={22} />
                    </div>
                    <div>
                      <h4 className="font-serif font-black text-sm uppercase text-emerald-950 tracking-wide">{centerSettings.name}</h4>
                      <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">REÇU DE CAISSE POSTALE ET MANDAT D'ENCAISSEMENT</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-mono font-extrabold inline-block">
                      POST-{payment.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 block">Date : {payment.paymentDate}</span>
                  </div>
                </div>

                {/* Form Grid */}
                <div className="space-y-3 bg-[#FAFDFB] p-5 rounded-2xl border border-emerald-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-100 pb-2">
                    <span className="text-gray-500 font-semibold uppercase text-[10px]">Mandant / Redevable (Élève) :</span>
                    <span className="font-bold text-sm text-gray-900">{studentName.toUpperCase()}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-100 pb-2">
                    <span className="text-gray-500 font-semibold uppercase text-[10px]">Identifiant / Matricule :</span>
                    <span className="font-mono font-bold text-xs">{payment.studentId.substring(0, 8).toUpperCase()}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-100 pb-2">
                    <span className="text-gray-500 font-semibold uppercase text-[10px]">Montant de l'Encaissement :</span>
                    <span className="font-black text-base text-emerald-900">{payment.amount.toLocaleString()} FCFA</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-emerald-100 pb-2 gap-1">
                    <span className="text-gray-500 font-semibold uppercase text-[10px] shrink-0 sm:w-44">Somme en toutes lettres :</span>
                    <span className="font-serif italic font-bold text-xs text-emerald-950 sm:text-right">{numberToWordsFR(payment.amount)}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-100 pb-2">
                    <span className="text-gray-500 font-semibold uppercase text-[10px]">Motif du Versement :</span>
                    <span className="font-bold text-gray-800">{courseName ? `Frais de Formation : ${courseName}` : (payment.description || 'Frais de scolarité')}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-100 pb-2">
                    <span className="text-gray-500 font-semibold uppercase text-[10px]">Mode de Règlement :</span>
                    <span className="font-bold text-gray-800">{getMethodLabel(payment.paymentMethod)} {payment.referenceNumber ? `(Réf : ${payment.referenceNumber})` : ''}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1">
                    <span className="text-gray-500 font-semibold uppercase text-[10px]">Situation du Solde :</span>
                    <span className={`font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700 font-extrabold'}`}>
                      {balance > 0 ? `Reste à Payer : ${balance.toLocaleString()} FCFA` : 'SITUATION ENTIÈREMENT SOLDÉE (SOLDE RÉGLÉ)'}
                    </span>
                  </div>
                </div>

                {/* Stamp & Signatures Box */}
                <div className="mt-6 grid grid-cols-2 gap-4 items-stretch">
                  <div className="p-3 border border-dashed border-gray-300 rounded-xl text-center flex flex-col justify-between h-28">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Émargement / Signature du Déposant</span>
                    <span className="text-[9px] text-gray-400 italic">Lu et approuvé</span>
                  </div>

                  <div className="p-3 border-2 border-emerald-800/40 rounded-xl text-center flex flex-col justify-between h-28 bg-emerald-50/30 relative">
                    <span className="text-[10px] font-extrabold text-emerald-950 uppercase">Cachet Humide & Signature Agent Caissier</span>
                    <div className="my-auto flex items-center justify-center gap-1 text-emerald-800 font-extrabold text-[10px] uppercase border border-emerald-300 py-0.5 px-2 rounded-full w-fit mx-auto bg-white">
                      <ShieldCheck size={12} />
                      Validé Caisse
                    </div>
                    <span className="text-[8px] text-gray-400">Certifié conforme • kalan gest KG</span>
                  </div>
                </div>

              </div>
            )}

          </div>
        </motion.div>
      </div>

      {/* WhatsApp Modal Overlay */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsWhatsAppModalOpen(false)}
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
                  <h4 className="font-serif font-bold text-lg text-[#1A1A1A]">Envoyer le Reçu par WhatsApp</h4>
                  <p className="text-xs text-[#8E9299]">Transmission directe au parent d'élève</p>
                </div>
              </div>
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1.5 text-[#8E9299] hover:text-[#1A1A1A] hover:bg-[#F5F5F0] rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Phone Input & Quick Chips */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E9299] flex items-center gap-1.5">
                <Phone size={13} />
                Numéro WhatsApp du Destinataire <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="Ex: 22376000000 ou 76000000"
                className="w-full px-4 py-3 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 text-sm font-mono font-semibold"
              />
              {(studentPhoneNumber || emergencyContact) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {studentPhoneNumber && (
                    <button
                      type="button"
                      onClick={() => setTargetPhone(studentPhoneNumber)}
                      className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl hover:bg-emerald-100 font-medium flex items-center gap-1 transition-all"
                    >
                      <Smartphone size={12} /> Tél Élève: {studentPhoneNumber}
                    </button>
                  )}
                  {emergencyContact && (
                    <button
                      type="button"
                      onClick={() => setTargetPhone(emergencyContact)}
                      className="text-[11px] px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl hover:bg-amber-100 font-medium flex items-center gap-1 transition-all"
                    >
                      <Phone size={12} /> Contact Parent: {emergencyContact}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Message Textarea */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E9299] flex items-center gap-1.5">
                <MessageSquare size={13} />
                Aperçu du Texte (Modifiable)
              </label>
              <textarea
                rows={9}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 text-xs font-mono leading-relaxed"
              />
            </div>

            {/* Modal Footer Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="flex-1 px-5 py-3 border border-[#E5E5E0] rounded-2xl text-xs font-bold uppercase text-[#8E9299] hover:bg-[#F9F9F7] transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
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
  );
};

