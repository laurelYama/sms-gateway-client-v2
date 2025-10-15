export interface CountryCode {
  refID: number;
  keyValue: string;
  value1: string;
  value2: string;
  value3: null;
  value4: null;
  refCategory: string;
}

export const COUNTRIES: CountryCode[] = [
  {
    "refID": 106,
    "keyValue": "AF",
    "value1": "Afghanistan",
    "value2": "+93",
    "value3": null,
    "value4": null,
    "refCategory": "004"
  },
  {
    "refID": 107,
    "keyValue": "ZA",
    "value1": "Afrique du Sud",
    "value2": "+27",
    "value3": null,
    "value4": null,
    "refCategory": "004"
  },
  {
    "refID": 108,
    "keyValue": "AL",
    "value1": "Albanie",
    "value2": "+355",
    "value3": null,
    "value4": null,
    "refCategory": "004"
  },
  {
    "refID": 109,
    "keyValue": "DZ",
    "value1": "Algérie",
    "value2": "+213",
    "value3": null,
    "value4": null,
    "refCategory": "004"
  },
  {
    "refID": 110,
    "keyValue": "DE",
    "value1": "Allemagne",
    "value2": "+49",
    "value3": null,
    "value4": null,
    "refCategory": "004"
  },
  {
    "refID": 170,
    "keyValue": "GA",
    "value1": "Gabon",
    "value2": "+241",
    "value3": null,
    "value4": null,
    "refCategory": "004"
  }
  // Autres pays peuvent être ajoutés ici si nécessaire
];

export const getCountryByCode = (code: string) => {
  return COUNTRIES.find(country => country.keyValue === code);
};

export const getDefaultCountry = () => {
  return COUNTRIES.find(country => country.keyValue === 'GA') || COUNTRIES[0];
};
