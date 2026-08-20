import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, Trash2, X, RefreshCw, FileText, UserPlus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';
import { exportToCSV } from '../lib/excelExport';

interface StudentRowPreview {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  studentIdNumber: string;
  emergencyContact: string;
  registrationDate: string;
  courseName: string;
  matchedCourseId?: string;
  selected: boolean;
  isValid: boolean;
}

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: any[];
  onSuccess: () => void;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  courses = [],
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<StudentRowPreview[]>([]);
  const [defaultCourseId, setDefaultCourseId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setPreviewRows([]);
    setDefaultCourseId('');
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Download example Excel / CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      'Prénom',
      'Nom',
      'Téléphone',
      'Email',
      'Matricule',
      'Contact Urgence',
      'Date Inscription',
      'Formation'
    ];

    const today = new Date().toISOString().split('T')[0];
    const sampleCourse = courses[0]?.name || 'Développement Web';

    const sampleRows = [
      ['Amadou', 'Diallo', '76001122', 'amadou.diallo@gmail.com', 'KG-2026-001', 'Oumar Diallo - 70001122', today, sampleCourse],
      ['Fatoumata', 'Traoré', '66554433', 'fatou.traore@yahoo.fr', 'KG-2026-002', 'Mariam Traoré - 65554433', today, sampleCourse]
    ];

    exportToCSV('modele_importation_eleves_kalan_gest', headers, sampleRows);
    toast.success('Modèle d\'importation téléchargé avec succès !');
  };

  const parseFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert worksheet to raw json objects
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (rawData.length === 0) {
          toast.error("Le fichier sélectionné est vide ou ne contient aucune donnée.");
          setPreviewRows([]);
          return;
        }

        const parsed: StudentRowPreview[] = rawData.map((row, idx) => {
          let firstName = '';
          let lastName = '';
          let phoneNumber = '';
          let email = '';
          let studentIdNumber = '';
          let emergencyContact = '';
          let registrationDate = new Date().toISOString().split('T')[0];
          let courseName = '';

          for (const [key, value] of Object.entries(row)) {
            const cleanKey = key
              .trim()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '');

            const strVal = String(value || '').trim();

            if (cleanKey.includes('prenom') || cleanKey === 'firstname' || cleanKey === 'first') {
              firstName = strVal;
            } else if (cleanKey === 'nom' || cleanKey === 'lastname' || cleanKey === 'last' || cleanKey.includes('nomdefamille')) {
              lastName = strVal;
            } else if (cleanKey.includes('teleph') || cleanKey.includes('phone') || cleanKey === 'tel' || cleanKey === 'mobile') {
              phoneNumber = strVal;
            } else if (cleanKey.includes('email') || cleanKey.includes('mail') || cleanKey.includes('courriel')) {
              email = strVal;
            } else if (cleanKey.includes('matricule') || cleanKey.includes('code') || cleanKey.includes('id') || cleanKey.includes('num')) {
              studentIdNumber = strVal;
            } else if (cleanKey.includes('urgence') || cleanKey.includes('parent') || cleanKey.includes('contact') || cleanKey.includes('tuteur')) {
              emergencyContact = strVal;
            } else if (cleanKey.includes('date') || cleanKey.includes('inscription')) {
              if (strVal) registrationDate = strVal;
            } else if (cleanKey.includes('formation') || cleanKey.includes('cours') || cleanKey.includes('class') || cleanKey.includes('filiere')) {
              courseName = strVal;
            }
          }

          // Combined full name fallback if prenom/nom not split
          if (!firstName && !lastName) {
            for (const [key, value] of Object.entries(row)) {
              const cleanKey = key.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
              if (cleanKey.includes('nom') || cleanKey.includes('eleve') || cleanKey.includes('etudiant') || cleanKey.includes('nomcomplet')) {
                const parts = String(value || '').trim().split(' ');
                if (parts.length >= 2) {
                  firstName = parts[0];
                  lastName = parts.slice(1).join(' ');
                } else if (parts.length === 1) {
                  lastName = parts[0];
                }
              }
            }
          }

          // Try matching course
          let matchedCourseId: string | undefined = undefined;
          if (courseName) {
            const foundCourse = courses.find(c => 
              c.name.toLowerCase().trim() === courseName.toLowerCase().trim() ||
              c.name.toLowerCase().includes(courseName.toLowerCase()) ||
              courseName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (foundCourse) {
              matchedCourseId = foundCourse.id;
            }
          }

          const isValid = Boolean(firstName && lastName);

          return {
            id: `row-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            firstName,
            lastName,
            phoneNumber,
            email,
            studentIdNumber,
            emergencyContact,
            registrationDate,
            courseName,
            matchedCourseId,
            selected: isValid,
            isValid
          };
        }).filter(r => r.firstName || r.lastName || r.phoneNumber || r.email);

        if (parsed.length === 0) {
          toast.error("Format de colonnes non reconnu. Veuillez utiliser notre modèle Excel.");
        } else {
          toast.success(`${parsed.length} élève(s) détecté(s) dans le fichier !`);
        }

        setPreviewRows(parsed);
      } catch (err) {
        console.error("Error reading file:", err);
        toast.error("Échec de la lecture du fichier Excel. Assurez-vous qu'il est valide.");
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      parseFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      parseFile(droppedFile);
    }
  };

  const toggleSelectRow = (id: string) => {
    setPreviewRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const toggleSelectAll = () => {
    const allSelected = previewRows.every(r => r.selected);
    setPreviewRows(prev => prev.map(r => ({ ...r, selected: !allSelected && r.isValid })));
  };

  const updateRowField = (id: string, field: keyof StudentRowPreview, value: string) => {
    setPreviewRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      updated.isValid = Boolean(updated.firstName && updated.lastName);
      return updated;
    }));
  };

  const removeRow = (id: string) => {
    setPreviewRows(prev => prev.filter(r => r.id !== id));
  };

  const handleImportSubmit = async () => {
    const selectedRows = previewRows.filter(r => r.selected && r.isValid);
    if (selectedRows.length === 0) {
      toast.error("Aucun élève valide sélectionné pour l'importation.");
      return;
    }

    setIsImporting(true);

    try {
      // Prepare payload with default course or matched course
      const payload = selectedRows.map(row => {
        const courseIds: string[] = [];
        if (row.matchedCourseId) {
          courseIds.push(row.matchedCourseId);
        }
        if (defaultCourseId && !courseIds.includes(defaultCourseId)) {
          courseIds.push(defaultCourseId);
        }

        return {
          firstName: row.firstName,
          lastName: row.lastName,
          phoneNumber: row.phoneNumber || '',
          email: row.email || '',
          studentIdNumber: row.studentIdNumber || '',
          emergencyContact: row.emergencyContact || '',
          registrationDate: row.registrationDate || new Date().toISOString().split('T')[0],
          status: 'active',
          courseIds
        };
      });

      // Send to backend bulk endpoint
      const res = await apiFetch('/api/students/bulk', {
        method: 'POST',
        body: JSON.stringify({ students: payload }),
        showToast: false
      });

      if (res && res.success) {
        toast.success(`Succès ! ${selectedRows.length} élève(s) ont été importés avec succès.`);
        onSuccess();
        handleClose();
      } else {
        // Fallback sequentially if bulk endpoint fails
        let successCount = 0;
        for (const studentItem of payload) {
          const newStudent = await apiFetch('/api/students', {
            method: 'POST',
            body: JSON.stringify({
              firstName: studentItem.firstName,
              lastName: studentItem.lastName,
              phoneNumber: studentItem.phoneNumber,
              email: studentItem.email,
              studentIdNumber: studentItem.studentIdNumber,
              emergencyContact: studentItem.emergencyContact,
              registrationDate: studentItem.registrationDate,
              status: 'active'
            }),
            showToast: false
          });

          if (newStudent && newStudent.id) {
            successCount++;
            for (const cId of studentItem.courseIds) {
              await apiFetch('/api/enrollments', {
                method: 'POST',
                body: JSON.stringify({
                  studentId: newStudent.id,
                  courseId: cId,
                  startDate: new Date().toISOString()
                }),
                showToast: false
              });
            }
          }
        }

        toast.success(`${successCount} élève(s) importé(s) avec succès !`);
        onSuccess();
        handleClose();
      }
    } catch (err) {
      console.error(err);
      toast.error("Une erreur s'est produite lors de l'importation.");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = previewRows.filter(r => r.selected && r.isValid).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-[2rem] shadow-2xl border border-[#E5E5E0] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E5E5E0] flex items-center justify-between bg-[#F9F9F7]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 border border-emerald-200/80 rounded-xl flex items-center justify-center text-emerald-800 shadow-sm">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                  Importer des élèves via Excel / CSV
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Ajoutez rapidement plusieurs élèves en téléversant un fichier Excel
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white border border-[#E5E5E0] flex items-center justify-center text-[#8E9299] hover:text-[#1A1A1A] hover:bg-gray-100 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Step 1: Template and File Upload */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider mb-1">
                    <Download size={15} /> Modèle Excel
                  </div>
                  <p className="text-xs text-emerald-800/80 leading-relaxed">
                    Téléchargez notre modèle pré-formaté pour organiser facilement vos élèves avant l'importation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  Télécharger le Modèle
                </button>
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`md:col-span-2 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  file
                    ? 'border-emerald-500 bg-emerald-50/30'
                    : 'border-[#E5E5E0] bg-[#F9F9F7] hover:border-emerald-400 hover:bg-emerald-50/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-[#E5E5E0] flex items-center justify-center text-emerald-700 mb-2">
                  <Upload size={22} />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">{file.name}</p>
                    <p className="text-xs text-emerald-700 font-medium mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB — Cliquez pour remplacer
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      Glissez-déposez votre fichier Excel / CSV ici
                    </p>
                    <p className="text-xs text-[#8E9299] mt-1">
                      Formats supportés: <span className="font-mono text-[#1A1A1A]">.xlsx</span>, <span className="font-mono text-[#1A1A1A]">.xls</span>, <span className="font-mono text-[#1A1A1A]">.csv</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Default Course Selector */}
            {previewRows.length > 0 && (
              <div className="p-4 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-bold text-[#1A1A1A] block">
                    Inscrire les élèves importés à une formation (Optionnel)
                  </label>
                  <p className="text-[11px] text-[#8E9299]">
                    S'applique si aucune formation spécifique n'est spécifiée dans la ligne Excel.
                  </p>
                </div>
                <select
                  value={defaultCourseId}
                  onChange={(e) => setDefaultCourseId(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 bg-white border border-[#E5E5E0] rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                >
                  <option value="">Aucune formation par défaut</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.price?.toLocaleString()} FCFA)</option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview Table */}
            {previewRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8E9299]">
                      Aperçu des élèves à importer ({previewRows.length})
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                      {validCount} prêt(s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold uppercase tracking-tight"
                  >
                    {previewRows.every(r => r.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>

                <div className="border border-[#E5E5E0] rounded-2xl overflow-x-auto max-h-72 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#F9F9F7] sticky top-0 z-10 text-[#8E9299] text-[10px] uppercase tracking-wider border-b border-[#E5E5E0]">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={previewRows.length > 0 && previewRows.every(r => r.selected)}
                            onChange={toggleSelectAll}
                            className="rounded border-[#E5E5E0] text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                        <th className="p-3 font-bold">Prénom *</th>
                        <th className="p-3 font-bold">Nom *</th>
                        <th className="p-3 font-bold">Téléphone</th>
                        <th className="p-3 font-bold">Email</th>
                        <th className="p-3 font-bold">Matricule</th>
                        <th className="p-3 font-bold">Formation Détectée</th>
                        <th className="p-3 w-10 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0EE]">
                      {previewRows.map((row) => {
                        const matchedCourse = courses.find(c => c.id === row.matchedCourseId);
                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors ${
                              !row.isValid
                                ? 'bg-red-50/40'
                                : row.selected
                                ? 'bg-white hover:bg-[#F9F9F7]'
                                : 'bg-gray-50/50 opacity-60'
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled={!row.isValid}
                                onChange={() => toggleSelectRow(row.id)}
                                className="rounded border-[#E5E5E0] text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.firstName}
                                onChange={(e) => updateRowField(row.id, 'firstName', e.target.value)}
                                placeholder="Prénom"
                                className={`w-full px-2 py-1 bg-transparent border rounded text-xs focus:outline-none ${
                                  !row.firstName ? 'border-red-400 bg-red-50' : 'border-transparent hover:border-[#E5E5E0]'
                                }`}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.lastName}
                                onChange={(e) => updateRowField(row.id, 'lastName', e.target.value)}
                                placeholder="Nom"
                                className={`w-full px-2 py-1 bg-transparent border rounded text-xs focus:outline-none ${
                                  !row.lastName ? 'border-red-400 bg-red-50' : 'border-transparent hover:border-[#E5E5E0]'
                                }`}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.phoneNumber}
                                onChange={(e) => updateRowField(row.id, 'phoneNumber', e.target.value)}
                                placeholder="Tél"
                                className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#E5E5E0] rounded text-xs focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.email}
                                onChange={(e) => updateRowField(row.id, 'email', e.target.value)}
                                placeholder="Email"
                                className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#E5E5E0] rounded text-xs focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.studentIdNumber}
                                onChange={(e) => updateRowField(row.id, 'studentIdNumber', e.target.value)}
                                placeholder="Matricule"
                                className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#E5E5E0] rounded text-xs font-mono focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              {matchedCourse ? (
                                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                  {matchedCourse.name}
                                </span>
                              ) : row.courseName ? (
                                <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold" title="Formation non trouvée dans le système">
                                  {row.courseName} (?)
                                </span>
                              ) : (
                                <span className="text-[#8E9299] italic text-[11px]">—</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                className="p-1 text-[#8E9299] hover:text-red-600 transition-colors"
                                title="Supprimer la ligne"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#F9F9F7] border-t border-[#E5E5E0] flex items-center justify-between">
            <div className="text-xs text-[#8E9299]">
              {previewRows.length > 0 ? (
                <span>
                  <strong className="text-[#1A1A1A]">{validCount}</strong> élève(s) sur <strong className="text-[#1A1A1A]">{previewRows.length}</strong> prêts à enregistrer
                </span>
              ) : (
                <span>Sélectionnez un fichier Excel pour commencer.</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isImporting}
                className="px-5 py-2.5 border border-[#E5E5E0] rounded-xl text-xs font-bold text-[#8E9299] hover:bg-white transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={isImporting || validCount === 0}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md flex items-center gap-2 ${
                  isImporting || validCount === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-emerald-800 hover:bg-emerald-950 active:scale-95'
                }`}
              >
                {isImporting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Importation en cours...
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    Importer {validCount > 0 ? `(${validCount})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
