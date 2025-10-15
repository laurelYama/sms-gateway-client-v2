'use client';

import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { fetchCountryCodes } from '@/lib/api/countries';
import { Phone } from 'lucide-react';

interface CountryCodeOption {
  value: string;
  label: string;
  code: string;
  flag: string;
}

interface PhoneInputProps {
  value: string;
  onChange: (value: { phone: string; countryCode: string }) => void;
  className?: string;
  placeholder?: string;
}

export function PhoneInput({
  value,
  onChange,
  onCountryCodeChange,
  className = '',
  placeholder = 'Entrez le numéro de téléphone'
}: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState<CountryCodeOption>({
    value: 'Gabon',
    label: '🇬🇦 +241',
    code: '+241',
    flag: '🇬🇦',
    name: 'Gabon'
  });
  
  const [countryOptions, setCountryOptions] = useState<CountryCodeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countries = await fetchCountryCodes();
        const options = countries.map(country => ({
          value: country.value1, // Utilisation du nom du pays comme valeur
          label: `${country.value1} (${country.value2})`,
          code: country.value2,
          name: country.value1
        }));
        
        setCountryOptions(options);
        
        // Définir le Gabon comme valeur par défaut
        const gabon = options.find(opt => opt.name === 'Gabon') || options[0];
        if (gabon) {
          setCountryCode(gabon);
          onCountryCodeChange?.(gabon.code);
        }
      } catch (error) {
        console.error('Erreur de chargement des pays:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCountries();
  }, [onCountryCodeChange]);

  // Fonction simplifiée pour obtenir un emoji de drapeau
  const getFlagEmoji = (countryName: string) => {
    // Retourne un drapeau générique si nécessaire
    return '🌍';
  };

  const handleCountryChange = (selectedOption: any) => {
    if (selectedOption) {
      setCountryCode(selectedOption);
      // Mettre à jour le numéro avec le nouvel indicatif si nécessaire
      if (value) {
        onChange({
          phone: value,
          countryCode: selectedOption.code
        });
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Mettre à jour la valeur du champ
    setPhoneValue(newValue);
    // Appeler la fonction onChange avec les nouvelles valeurs
    onChange({
      phone: newValue,
      countryCode: countryCode.code
    });
  };
  
  // Utiliser un état local pour la valeur du champ
  const [phoneValue, setPhoneValue] = useState(value);
  
  // Mettre à jour la valeur locale quand la prop value change
  useEffect(() => {
    setPhoneValue(value);
  }, [value]);

  return (
    <div className={`flex rounded-md shadow-sm ${className}`}>
      <div className="relative flex-shrink-0 w-40">
        <Select
          options={countryOptions}
          value={countryCode}
          onChange={handleCountryChange}
          isSearchable
          placeholder="Sélectionnez un pays"
          className="text-sm"
          classNamePrefix="select"
          isLoading={isLoading}
          formatOptionLabel={(option) => (
            <div className="flex flex-col">
              <span className="font-medium">{option.name}</span>
              <span className="text-xs text-muted-foreground">{option.code}</span>
            </div>
          )}
          styles={{
            control: (base) => ({
              ...base,
              height: '100%',
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              borderRight: 'none',
              minHeight: '40px',
            }),
            option: (base) => ({
              ...base,
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
            }),
          }}
        />
      </div>
      <div className="relative flex-1">
        <input
          type="tel"
          value={phoneValue}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          className="block w-full rounded-r-md border border-gray-300 px-3 py-2 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-full"
          name="phone"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Phone className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
