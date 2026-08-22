export interface Operator {
  value: string;
  label: string;
}

/**
 * Opérateurs Mobile Money par pays — utilisé pour le dépôt/retrait.
 * Pour les 10 pays d'Afrique de l'Ouest couverts par SASpay (CI, SN, ML,
 * BF, BJ, TG, NE, GN, GH, NG), les `value` sont les codes `network` EXACTS
 * documentés par SASpay (docs.saspay.me/api-reference/reference/formats) —
 * ne pas les modifier sans revérifier cette page, l'API de dépôt en dépend
 * directement (payload `network`).
 */
export const OPERATORS_BY_COUNTRY: Record<string, Operator[]> = {
  CI: [
    { value: "orange_ci", label: "Orange Money" },
    { value: "mtn_ci", label: "MTN MoMo" },
    { value: "wave_ci", label: "Wave" },
    { value: "moov_ci", label: "Moov Money" },
  ],
  SN: [
    { value: "orange_sn", label: "Orange Money" },
    { value: "wave_sn", label: "Wave" },
    { value: "freemoney_sn", label: "Free Money" },
    { value: "wizall_sn", label: "Wizall" },
  ],
  ML: [
    { value: "orange_ml", label: "Orange Money" },
    { value: "moov_ml", label: "Moov Money" },
    { value: "mobi_cash_ml", label: "Mobicash" },
  ],
  BF: [
    { value: "orange_bf", label: "Orange Money" },
    { value: "moov_bf", label: "Moov Money" },
  ],
  BJ: [
    { value: "mtn_bj", label: "MTN Money" },
    { value: "moov_bj", label: "Moov Money" },
    { value: "celtiis_bj", label: "Celtiis Cash" },
  ],
  TG: [
    { value: "togocel", label: "T-Money" },
    { value: "moov_tg", label: "Moov Money" },
  ],
  NE: [{ value: "airtel_ne", label: "Airtel Money" }],
  GN: [
    { value: "orange_gn", label: "Orange Money" },
    { value: "mtn_gn", label: "MTN MoMo" },
  ],
  GH: [
    { value: "mtn_gh", label: "MTN MoMo" },
    { value: "vodafone_gh", label: "Vodafone Cash" },
    { value: "tigo_gh", label: "AirtelTigo" },
  ],
  NG: [
    { value: "mtn_ng", label: "MTN MoMo" },
    { value: "airtel_ng", label: "Airtel Money" },
  ],
  CM: [
    { value: "mtn_momo_cm", label: "MTN MoMo" },
    { value: "orange_money_cm", label: "Orange Money" },
  ],
  GA: [{ value: "airtel_money_ga", label: "Airtel Money" }],
  CD: [
    { value: "vodacom_mpesa_cd", label: "Vodacom M-Pesa" },
    { value: "airtel_money_cd", label: "Airtel Money" },
    { value: "orange_money_cd", label: "Orange Money" },
  ],
  CG: [
    { value: "mtn_momo_cg", label: "MTN MoMo" },
    { value: "airtel_money_cg", label: "Airtel Money" },
  ],
  KE: [{ value: "mpesa_ke", label: "M-Pesa" }],
};

const DEFAULT_OPERATORS: Operator[] = [{ value: "mobile_money", label: "Mobile Money" }];

export function getOperatorsForCountry(countryCode: string): Operator[] {
  return OPERATORS_BY_COUNTRY[countryCode] ?? DEFAULT_OPERATORS;
}
