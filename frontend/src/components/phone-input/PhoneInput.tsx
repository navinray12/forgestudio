import React, { useState, useEffect, useCallback } from "react";
import { CountrySelector } from "./CountrySelector";
import {
  parsePhoneNumber,
  validateNationalNumber,
  buildFullPhoneNumber,
} from "./phoneInput.utils";
import type { CountryData } from "./phoneCountries";
import type { PhoneInputProps } from "./phoneInput.types";

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value = "",
  defaultCountryIso = "IN",
  onChange,
  onBlur,
  disabled = false,
  required = false,
  id = "phone-input",
  name = "phoneNumber",
  className = "",
  inputClassName = "",
  selectorClassName = "",
  error: externalError,
  showErrorText = true,
  label,
  autoFocus = false,
}) => {
  // Initialize country & national number from value or default country
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(() => {
    const parsed = parsePhoneNumber(value, defaultCountryIso);
    return parsed.country;
  });

  const [nationalNumber, setNationalNumber] = useState<string>(() => {
    const parsed = parsePhoneNumber(value, defaultCountryIso);
    return parsed.nationalNumber;
  });

  const [internalError, setInternalError] = useState<string | undefined>(
    undefined
  );

  const emitChange = useCallback(
    (country: CountryData, num: string) => {
      const cleanNum = num.replace(/\D/g, "");
      const fullNumber = buildFullPhoneNumber(country.dialCode, cleanNum);

      let isValid = true;
      let errorMessage: string | undefined = undefined;

      if (cleanNum || required) {
        const validation = validateNationalNumber(cleanNum, country);
        isValid = validation.isValid;
        errorMessage = validation.errorMessage;
      }

      setInternalError(errorMessage);

      if (onChange) {
        onChange({
          country,
          dialCode: country.dialCode,
          nationalNumber: cleanNum,
          fullNumber,
          isValid,
          errorMessage,
        });
      }
    },
    [onChange, required]
  );

  // Sync external value changes (e.g., initial form load or reset)
  useEffect(() => {
    if (value !== undefined) {
      const parsed = parsePhoneNumber(value, defaultCountryIso);
      setSelectedCountry((prevCountry) => {
        // If parsed country differs from state (e.g. initial load with full international number)
        if (parsed.country.iso !== prevCountry.iso && value.startsWith("+")) {
          return parsed.country;
        }
        return prevCountry;
      });

      setNationalNumber((prevNum) => {
        if (parsed.nationalNumber !== prevNum) {
          return parsed.nationalNumber;
        }
        return prevNum;
      });
    }
  }, [value, defaultCountryIso]);

  // Handle Country Selection
  const handleCountrySelect = (country: CountryData) => {
    setSelectedCountry(country);
    emitChange(country, nationalNumber);
  };

  // Handle National Phone Number Typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // If user attempts to type '+' or paste international number directly into box, parse it!
    if (rawVal.startsWith("+")) {
      const parsed = parsePhoneNumber(rawVal, selectedCountry.iso);
      setSelectedCountry(parsed.country);
      setNationalNumber(parsed.nationalNumber);
      emitChange(parsed.country, parsed.nationalNumber);
      return;
    }

    const digitsOnly = rawVal.replace(/\D/g, "");
    setNationalNumber(digitsOnly);
    emitChange(selectedCountry, digitsOnly);
  };

  const displayError = externalError || internalError;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500 font-bold">*</span>}
        </label>
      )}

      {/* Inputs Container */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full">
        {/* Country Selector Box */}
        <CountrySelector
          id={`${id}-country-selector`}
          selectedCountry={selectedCountry}
          onSelectCountry={handleCountrySelect}
          disabled={disabled}
          className={selectorClassName}
        />

        {/* National Number Input Box */}
        <div className="relative flex-1">
          <input
            id={id}
            name={name}
            type="tel"
            disabled={disabled}
            required={required}
            autoFocus={autoFocus}
            value={nationalNumber}
            onChange={handleInputChange}
            onBlur={onBlur}
            placeholder={selectedCountry.placeholder}
            className={`h-11 w-full rounded-xl border bg-[#f8fafc] px-4 text-xs sm:text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 ${
              displayError
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                : "border-slate-200"
            } ${inputClassName}`}
          />
        </div>
      </div>

      {/* Error Message */}
      {showErrorText && displayError && (
        <p className="text-[11px] font-medium text-red-500 mt-0.5">
          {displayError}
        </p>
      )}
    </div>
  );
};
