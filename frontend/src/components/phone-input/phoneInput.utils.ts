/**
 * @file Phone Input utils: React UI composition and event handling for this screen or component.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { COUNTRY_DATA, DEFAULT_COUNTRY } from "./phoneCountries";
import type { CountryData } from "./phoneCountries";

/**
 * Find Country By Iso.
 * @param iso Iso supplied to this operation (type: string). Optional; callers may omit it.
 */
export function findCountryByIso(iso?: string): CountryData {
  if (!iso) return DEFAULT_COUNTRY;
  const found = COUNTRY_DATA.find(
    (c) => c.iso.toUpperCase() === iso.toUpperCase()
  );
  return found || DEFAULT_COUNTRY;
}

/**
 * Parse Phone Number.
 * @param rawInput Raw Input supplied to this operation (type: string). Optional; callers may omit it.
 * @param defaultIso Default Iso supplied to this operation (type: string). Defaults to "IN".
 */
export function parsePhoneNumber(
  rawInput?: string,
  defaultIso: string = "IN"
): { country: CountryData; nationalNumber: string } {
  if (!rawInput) {
    return { country: findCountryByIso(defaultIso), nationalNumber: "" };
  }

  const cleanInput = rawInput.trim();

  if (cleanInput.startsWith("+")) {
    // Sort countries by dial code length descending so +971 is checked before +9
    const sortedCountries = [...COUNTRY_DATA].sort(
      (a, b) => b.dialCode.length - a.dialCode.length
    );

    for (const country of sortedCountries) {
      if (cleanInput.startsWith(country.dialCode)) {
        const nationalPart = cleanInput
          .slice(country.dialCode.length)
          .replace(/\D/g, "");
        return {
          country,
          nationalNumber: nationalPart,
        };
      }
    }
  }

  // Fallback if no country dial code matched or no '+' prefix
  const digitsOnly = cleanInput.replace(/\D/g, "");
  return {
    country: findCountryByIso(defaultIso),
    nationalNumber: digitsOnly,
  };
}

/**
 * Validate National Number.
 * @param nationalNumber National Number supplied to this operation (type: string).
 * @param country Country supplied to this operation (type: CountryData).
 */
export function validateNationalNumber(
  nationalNumber: string,
  country: CountryData
): { isValid: boolean; errorMessage?: string } {
  const digitsOnly = nationalNumber.replace(/\D/g, "");

  if (!digitsOnly) {
    return {
      isValid: false,
      errorMessage: "Phone number is required.",
    };
  }

  const expected = country.expectedDigits;

  if (typeof expected === "number") {
    if (digitsOnly.length !== expected) {
      return {
        isValid: false,
        errorMessage: `Please enter a valid ${expected}-digit ${country.name} phone number.`,
      };
    }
  } else if (Array.isArray(expected)) {
    if (!expected.includes(digitsOnly.length)) {
      const min = Math.min(...expected);
      const max = Math.max(...expected);
      return {
        isValid: false,
        errorMessage: `Please enter a valid ${country.name} phone number (${min}-${max} digits).`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Search Countries.
 * @param query Query supplied to this operation (type: string).
 * @param countries Countries supplied to this operation (type: CountryData[]). Defaults to COUNTRY_DATA.
 */
export function searchCountries(
  query: string,
  countries: CountryData[] = COUNTRY_DATA
): CountryData[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return countries;

  const cleanNumQuery = trimmed.replace(/^\+/, "");

  return countries.filter((c) => {
    const nameMatch = c.name.toLowerCase().includes(trimmed);
    const isoMatch = c.iso.toLowerCase().includes(trimmed);
    const dialMatch = c.dialCode.replace("+", "").includes(cleanNumQuery);
    return nameMatch || isoMatch || dialMatch;
  });
}

/**
 * Build Full Phone Number.
 * @param dialCode Dial Code supplied to this operation (type: string).
 * @param nationalNumber National Number supplied to this operation (type: string).
 */
export function buildFullPhoneNumber(
  dialCode: string,
  nationalNumber: string
): string {
  const digitsOnly = nationalNumber.replace(/\D/g, "");
  if (!digitsOnly) return "";
  const cleanDialCode = dialCode.startsWith("+")
    ? dialCode
    : `+${dialCode}`;
  return `${cleanDialCode}${digitsOnly}`;
}
