import type { CountryData } from "./phoneCountries";

export interface PhoneInputValue {
  country: CountryData;
  dialCode: string;
  nationalNumber: string;
  fullNumber: string; // e.g. "+919876543210"
  isValid: boolean;
  errorMessage?: string;
}

export interface PhoneInputProps {
  value?: string; // Can be national "9876543210" or full "+919876543210"
  defaultCountryIso?: string; // Default e.g. "IN"
  onChange?: (value: PhoneInputValue) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  inputClassName?: string;
  selectorClassName?: string;
  error?: string;
  showErrorText?: boolean;
  label?: string;
  autoFocus?: boolean;
}

export interface CountrySelectorProps {
  selectedCountry: CountryData;
  onSelectCountry: (country: CountryData) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}
