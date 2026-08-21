export interface Operator {
  value: string;
  label: string;
}

/** Opérateurs Mobile Money par pays — utilisé pour le dépôt/retrait. */
export const OPERATORS_BY_COUNTRY: Record<string, Operator[]> = {
  CI: [
    { value: "orange_money_ci", label: "Orange Money" },
    { value: "mtn_momo_ci", label: "MTN MoMo" },
    { value: "wave_ci", label: "Wave" },
    { value: "moov_ci", label: "Moov Money" },
  ],
  SN: [
    { value: "orange_money_sn", label: "Orange Money" },
    { value: "wave_sn", label: "Wave" },
    { value: "free_money_sn", label: "Free Money" },
  ],
  ML: [
    { value: "orange_money_ml", label: "Orange Money" },
    { value: "moov_ml", label: "Moov Money" },
  ],
  BF: [
    { value: "orange_money_bf", label: "Orange Money" },
    { value: "moov_bf", label: "Moov Money" },
  ],
  BJ: [
    { value: "mtn_money_bj", label: "MTN Money" },
    { value: "moov_bj", label: "Moov Money" },
  ],
  TG: [
    { value: "t_money_tg", label: "T-Money" },
    { value: "moov_tg", label: "Moov Money" },
  ],
  NE: [
    { value: "orange_money_ne", label: "Orange Money" },
    { value: "moov_ne", label: "Moov Money" },
  ],
  GN: [
    { value: "orange_money_gn", label: "Orange Money" },
    { value: "mtn_gn", label: "MTN MoMo" },
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
  NG: [{ value: "mtn_momo_ng", label: "MTN MoMo" }],
  GH: [{ value: "mtn_momo_gh", label: "MTN MoMo" }],
  KE: [{ value: "mpesa_ke", label: "M-Pesa" }],
};

const DEFAULT_OPERATORS: Operator[] = [{ value: "mobile_money", label: "Mobile Money" }];

export function getOperatorsForCountry(countryCode: string): Operator[] {
  return OPERATORS_BY_COUNTRY[countryCode] ?? DEFAULT_OPERATORS;
}
