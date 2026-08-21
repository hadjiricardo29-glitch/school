export interface Country {
  code: string;
  name: string;
  phoneCode: string;
}

export const COUNTRIES: Country[] = [
  { code: "CI", name: "Côte d'Ivoire", phoneCode: "+225" },
  { code: "SN", name: "Sénégal", phoneCode: "+221" },
  { code: "ML", name: "Mali", phoneCode: "+223" },
  { code: "BF", name: "Burkina Faso", phoneCode: "+226" },
  { code: "BJ", name: "Bénin", phoneCode: "+229" },
  { code: "TG", name: "Togo", phoneCode: "+228" },
  { code: "NE", name: "Niger", phoneCode: "+227" },
  { code: "GN", name: "Guinée", phoneCode: "+224" },
  { code: "CM", name: "Cameroun", phoneCode: "+237" },
  { code: "GA", name: "Gabon", phoneCode: "+241" },
  { code: "CD", name: "RD Congo", phoneCode: "+243" },
  { code: "CG", name: "Congo", phoneCode: "+242" },
  { code: "NG", name: "Nigeria", phoneCode: "+234" },
  { code: "GH", name: "Ghana", phoneCode: "+233" },
  { code: "KE", name: "Kenya", phoneCode: "+254" },
  { code: "MA", name: "Maroc", phoneCode: "+212" },
  { code: "DZ", name: "Algérie", phoneCode: "+213" },
  { code: "TN", name: "Tunisie", phoneCode: "+216" },
  { code: "FR", name: "France", phoneCode: "+33" },
  { code: "OTHER", name: "Autre", phoneCode: "+" },
];
