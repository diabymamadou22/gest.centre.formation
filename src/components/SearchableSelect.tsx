import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: (Option | string)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowCustomValue?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Sélectionner ou chercher...",
  className = "",
  disabled = false,
  allowCustomValue = false,
  required = false,
  id,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options
  const normalizedOptions: Option[] = options.map((opt) => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Selected Option
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : value;

  // Filtered options based on search term
  const filteredOptions = normalizedOptions.filter((opt) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(term)) ||
      opt.value.toLowerCase().includes(term)
    );
  });

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
        className={`w-full px-3.5 py-2.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl flex items-center justify-between text-sm cursor-pointer transition-all select-none hover:border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
        } ${isOpen ? 'ring-2 ring-emerald-500/20 border-emerald-600' : ''}`}
      >
        <span className={`truncate mr-2 ${!displayLabel ? 'text-gray-400 font-normal' : 'text-[#1A1A1A] font-medium'}`}>
          {displayLabel || placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 text-[#8E9299]">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-900' : ''}`} />
        </div>
      </div>

      {/* Hidden input for HTML form compatibility if name/required is passed */}
      <input type="hidden" name={name} value={value} required={required && !value} />

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 bg-white border border-[#E5E5E0] rounded-2xl shadow-xl overflow-hidden max-h-64 flex flex-col min-w-[200px]"
          >
            {/* Search Input Box inside dropdown */}
            <div className="p-2 border-b border-[#E5E5E0] bg-[#FAF9F6] sticky top-0 z-10 flex items-center gap-2">
              <Search size={15} className="text-[#8E9299] shrink-0 ml-1.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tapez pour filtrer..."
                className="w-full bg-transparent border-none text-xs text-[#1A1A1A] focus:outline-none placeholder-gray-400 py-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredOptions.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredOptions[0].value);
                  } else if (e.key === 'Enter' && allowCustomValue && searchTerm.trim()) {
                    e.preventDefault();
                    handleSelect(searchTerm.trim());
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-48">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => {
                  const isSelected = option.value === value;
                  return (
                    <div
                      key={`${option.value}-${idx}`}
                      onClick={() => handleSelect(option.value)}
                      className={`px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-semibold'
                          : 'hover:bg-[#F5F5F0] text-[#1A1A1A]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate">{option.label}</div>
                        {option.sublabel && (
                          <div className="text-[10px] text-gray-400 truncate">{option.sublabel}</div>
                        )}
                      </div>
                      {isSelected && <Check size={14} className="text-emerald-700 shrink-0" />}
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-[#8E9299]">
                  {allowCustomValue && searchTerm.trim() ? (
                    <button
                      type="button"
                      onClick={() => handleSelect(searchTerm.trim())}
                      className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl font-medium transition-colors"
                    >
                      Utiliser "{searchTerm.trim()}"
                    </button>
                  ) : (
                    "Aucun résultat trouvé"
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
