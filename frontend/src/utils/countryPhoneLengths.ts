/**
 * countryPhoneLengths.ts
 *
 * Maps ISO 3166-1 alpha-2 country codes to the exact number of digits
 * expected in the national subscriber number (excluding the country calling code).
 *
 * When a country has variable-length numbers, the MAXIMUM is used.
 * Source: ITU-T E.164 / Wikipedia national dialing plans.
 */

export const countryPhoneLengths: Record<string, number> = {
  // ── Africa ────────────────────────────────────────────────────────────────
  AO: 9,  // Angola
  BJ: 8,  // Benin
  BW: 8,  // Botswana
  BF: 8,  // Burkina Faso
  BI: 8,  // Burundi
  CM: 9,  // Cameroon
  CV: 7,  // Cape Verde
  CF: 8,  // Central African Republic
  TD: 8,  // Chad
  KM: 7,  // Comoros
  CG: 9,  // Republic of the Congo
  CD: 9,  // DR Congo
  CI: 10, // Côte d'Ivoire
  DJ: 8,  // Djibouti
  EG: 10, // Egypt
  GQ: 9,  // Equatorial Guinea
  ER: 7,  // Eritrea
  ET: 9,  // Ethiopia
  GA: 8,  // Gabon
  GM: 7,  // Gambia
  GH: 9,  // Ghana
  GN: 9,  // Guinea
  GW: 9,  // Guinea-Bissau
  KE: 9,  // Kenya
  LS: 8,  // Lesotho
  LR: 8,  // Liberia
  LY: 9,  // Libya
  MG: 9,  // Madagascar
  MW: 9,  // Malawi
  ML: 8,  // Mali
  MR: 8,  // Mauritania
  MU: 8,  // Mauritius
  YT: 9,  // Mayotte
  MA: 9,  // Morocco
  MZ: 9,  // Mozambique
  NA: 9,  // Namibia
  NE: 8,  // Niger
  NG: 10, // Nigeria
  RE: 9,  // Réunion
  RW: 9,  // Rwanda
  ST: 7,  // São Tomé and Príncipe
  SN: 9,  // Senegal
  SC: 7,  // Seychelles
  SL: 8,  // Sierra Leone
  SO: 9,  // Somalia
  ZA: 9,  // South Africa
  SS: 9,  // South Sudan
  SD: 9,  // Sudan
  SZ: 8,  // Eswatini (Swaziland)
  TZ: 9,  // Tanzania
  TG: 8,  // Togo
  TN: 8,  // Tunisia
  UG: 9,  // Uganda
  EH: 9,  // Western Sahara
  ZM: 9,  // Zambia
  ZW: 9,  // Zimbabwe

  // ── Americas ─────────────────────────────────────────────────────────────
  AG: 10, // Antigua and Barbuda
  AR: 10, // Argentina
  AW: 7,  // Aruba
  BS: 10, // Bahamas
  BB: 10, // Barbados
  BZ: 7,  // Belize
  BM: 10, // Bermuda
  BO: 8,  // Bolivia
  BQ: 7,  // Bonaire
  BR: 11, // Brazil
  VG: 10, // British Virgin Islands
  CA: 10, // Canada
  KY: 10, // Cayman Islands
  CL: 9,  // Chile
  CO: 10, // Colombia
  CR: 8,  // Costa Rica
  CU: 8,  // Cuba
  CW: 7,  // Curaçao
  DM: 10, // Dominica
  DO: 10, // Dominican Republic
  EC: 9,  // Ecuador
  SV: 8,  // El Salvador
  FK: 5,  // Falkland Islands
  GF: 9,  // French Guiana
  GD: 10, // Grenada
  GP: 9,  // Guadeloupe
  GT: 8,  // Guatemala
  GY: 7,  // Guyana
  HT: 8,  // Haiti
  HN: 8,  // Honduras
  JM: 10, // Jamaica
  MQ: 9,  // Martinique
  MX: 10, // Mexico
  MS: 10, // Montserrat
  NI: 8,  // Nicaragua
  PA: 8,  // Panama
  PY: 9,  // Paraguay
  PE: 9,  // Peru
  PR: 10, // Puerto Rico
  KN: 10, // Saint Kitts and Nevis
  LC: 10, // Saint Lucia
  SX: 10, // Sint Maarten
  VC: 10, // Saint Vincent and the Grenadines
  SR: 7,  // Suriname
  TT: 10, // Trinidad and Tobago
  TC: 10, // Turks and Caicos Islands
  US: 10, // United States
  VI: 10, // US Virgin Islands
  UY: 9,  // Uruguay
  VE: 10, // Venezuela

  // ── Asia ──────────────────────────────────────────────────────────────────
  AF: 9,  // Afghanistan
  AM: 8,  // Armenia
  AZ: 9,  // Azerbaijan
  BH: 8,  // Bahrain
  BD: 10, // Bangladesh
  BT: 8,  // Bhutan
  BN: 7,  // Brunei
  KH: 9,  // Cambodia
  CN: 11, // China
  GE: 9,  // Georgia
  HK: 8,  // Hong Kong
  IN: 10, // India
  ID: 12, // Indonesia
  IR: 10, // Iran
  IQ: 10, // Iraq
  IL: 9,  // Israel
  JP: 10, // Japan
  JO: 9,  // Jordan
  KZ: 10, // Kazakhstan
  KW: 8,  // Kuwait
  KG: 9,  // Kyrgyzstan
  LA: 9,  // Laos
  LB: 8,  // Lebanon
  MO: 8,  // Macao
  MY: 10, // Malaysia
  MV: 7,  // Maldives
  MN: 8,  // Mongolia
  MM: 9,  // Myanmar
  NP: 10, // Nepal
  KP: 10, // North Korea
  OM: 8,  // Oman
  PK: 10, // Pakistan
  PS: 9,  // Palestine
  PH: 10, // Philippines
  QA: 8,  // Qatar
  SA: 9,  // Saudi Arabia
  SG: 8,  // Singapore
  KR: 10, // South Korea
  LK: 9,  // Sri Lanka
  SY: 9,  // Syria
  TW: 9,  // Taiwan
  TJ: 9,  // Tajikistan
  TH: 9,  // Thailand
  TL: 8,  // Timor-Leste
  TM: 8,  // Turkmenistan
  AE: 9,  // United Arab Emirates
  UZ: 9,  // Uzbekistan
  VN: 10, // Vietnam
  YE: 9,  // Yemen

  // ── Europe ────────────────────────────────────────────────────────────────
  AL: 9,  // Albania
  AD: 9,  // Andorra
  AT: 10, // Austria
  BY: 9,  // Belarus
  BE: 9,  // Belgium
  BA: 8,  // Bosnia and Herzegovina
  BG: 9,  // Bulgaria
  HR: 9,  // Croatia
  CY: 8,  // Cyprus
  CZ: 9,  // Czech Republic
  DK: 8,  // Denmark
  EE: 8,  // Estonia
  FO: 6,  // Faroe Islands
  FI: 10, // Finland
  FR: 9,  // France
  DE: 11, // Germany
  GI: 8,  // Gibraltar
  GR: 10, // Greece
  GG: 10, // Guernsey
  HU: 9,  // Hungary
  IS: 7,  // Iceland
  IE: 9,  // Ireland
  IM: 10, // Isle of Man
  IT: 10, // Italy
  JE: 10, // Jersey
  XK: 8,  // Kosovo
  LV: 8,  // Latvia
  LI: 9,  // Liechtenstein
  LT: 8,  // Lithuania
  LU: 9,  // Luxembourg
  MK: 8,  // North Macedonia
  MT: 8,  // Malta
  MD: 8,  // Moldova
  MC: 9,  // Monaco
  ME: 8,  // Montenegro
  NL: 9,  // Netherlands
  NO: 8,  // Norway
  PL: 9,  // Poland
  PT: 9,  // Portugal
  RO: 9,  // Romania
  RU: 10, // Russia
  SM: 10, // San Marino
  RS: 9,  // Serbia
  SK: 9,  // Slovakia
  SI: 8,  // Slovenia
  ES: 9,  // Spain
  SE: 9,  // Sweden
  CH: 9,  // Switzerland
  TR: 10, // Turkey
  UA: 9,  // Ukraine
  GB: 10, // United Kingdom
  VA: 10, // Vatican City

  // ── Oceania ───────────────────────────────────────────────────────────────
  AS: 7,  // American Samoa
  AU: 9,  // Australia
  CK: 5,  // Cook Islands
  FJ: 7,  // Fiji
  PF: 8,  // French Polynesia
  GU: 10, // Guam
  KI: 8,  // Kiribati
  MH: 7,  // Marshall Islands
  FM: 7,  // Micronesia
  NR: 7,  // Nauru
  NC: 6,  // New Caledonia
  NZ: 9,  // New Zealand
  NU: 4,  // Niue
  NF: 6,  // Norfolk Island
  MP: 10, // Northern Mariana Islands
  PW: 7,  // Palau
  PG: 8,  // Papua New Guinea
  WS: 7,  // Samoa
  SB: 7,  // Solomon Islands
  TK: 4,  // Tokelau
  TO: 7,  // Tonga
  TV: 6,  // Tuvalu
  VU: 7,  // Vanuatu
  WF: 6,  // Wallis and Futuna
};

/**
 * Returns the maximum allowed digits for a given ISO 3166-1 alpha-2 country code.
 * Falls back to 15 (ITU-T E.164 maximum) if the country is not in the list.
 */
export const getCountryMaxLength = (countryCode: string | undefined | null): number => {
  if (!countryCode) return 15;
  return countryPhoneLengths[countryCode.toUpperCase()] ?? 15;
};
