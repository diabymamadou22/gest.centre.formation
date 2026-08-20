import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoUploaderProps {
  value?: string;
  onChange: (photoBase64: string) => void;
  onRemove: () => void;
}

export const compressImage = (file: File, maxWidth = 350, maxHeight = 350): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          reject(new Error('Canvas context unavailable'));
        }
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ value, onChange, onRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image valide');
      return;
    }

    try {
      const base64 = await compressImage(file);
      onChange(base64);
      toast.success('Photo ajoutée avec succès');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement de la photo');
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } },
        audio: false
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error(err);
      toast.error("Accès à la caméra refusé ou non disponible sur cet appareil");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 350;
    canvas.height = video.videoHeight || 350;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoBase64 = canvas.toDataURL('image/jpeg', 0.85);
      onChange(photoBase64);
      toast.success('Photo prise par la caméra !');
      stopCamera();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl">
      <div className="relative group">
        <div className="w-24 h-28 rounded-2xl bg-white border-2 border-dashed border-[#E5E5E0] overflow-hidden flex flex-col items-center justify-center shadow-inner relative">
          {value ? (
            <img src={value} alt="Aperçu élève" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="text-center p-2 text-[#8E9299]">
              <Camera size={24} className="mx-auto mb-1 opacity-50" />
              <span className="text-[9px] uppercase tracking-wider font-bold block">Photo d'Élève</span>
            </div>
          )}
        </div>

        {value && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-all"
            title="Supprimer la photo"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-center gap-2 w-full">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5E0] hover:bg-[#F0F0EE] text-[#1A1A1A] rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Upload size={13} />
          Choisir Fichier
        </button>

        <button
          type="button"
          onClick={startCamera}
          className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-900 text-white hover:bg-emerald-800 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Camera size={13} />
          Prendre Photo
        </button>
      </div>

      {/* Camera Capture Modal / Overlay */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center border border-[#E5E5E0]">
            <h4 className="font-serif font-bold text-lg mb-3 text-[#1A1A1A]">Prendre une photo</h4>
            <div className="w-64 h-64 bg-black rounded-2xl overflow-hidden relative border-2 border-emerald-500 shadow-inner mb-4">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
            </div>

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <Check size={16} /> Capturer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
