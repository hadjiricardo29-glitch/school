import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, Phone } from "lucide-react";
import { AuthCard } from "@/components/shared/AuthCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { COUNTRIES } from "@/config/countries";
import { registerUser } from "@/services/auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("CI");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralLocked, setReferralLocked] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
      setReferralLocked(true);
    }
  }, [searchParams]);

  const selectedCountry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (!acceptTerms || !acceptPrivacy) {
      setError("Vous devez accepter les conditions d'utilisation et la politique de confidentialité");
      return;
    }
    if (!referralCode.trim()) {
      setError("Le code de parrainage est requis pour créer un compte");
      return;
    }
    if (referralCode.trim().toUpperCase() === username.trim().toUpperCase()) {
      setError("Vous ne pouvez pas être votre propre parrain");
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser({
        email,
        password,
        username,
        firstName,
        lastName,
        country: selectedCountry.name,
        phoneCode: selectedCountry.phoneCode,
        phone,
        referralCode: referralCode || undefined,
      });

      if (result.session) {
        navigate("/dashboard", { replace: true });
      } else {
        setConfirmationSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <AuthCard title="Vérifiez votre email">
        <Alert tone="success">
          Un email de confirmation a été envoyé à <strong>{email}</strong>. Cliquez sur le lien reçu pour activer votre
          compte, puis connectez-vous.
        </Alert>
        <Link to="/login" className="mt-6 block">
          <Button fullWidth>Aller à la connexion</Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Créer un compte"
      subtitle="Rejoignez Motosu et commencez à gagner"
      footer={
        <>
          Déjà un compte ?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Nom" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <Input
          label="Nom d'utilisateur"
          required
          leftIcon={<User className="size-4" />}
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
          placeholder="prince123"
          hint="Utilisé pour votre lien de parrainage"
        />

        <Input
          label="Email"
          type="email"
          required
          leftIcon={<Mail className="size-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Pays"
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
          <Input
            label="Téléphone"
            required
            leftIcon={<Phone className="size-4" />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={`${selectedCountry.phoneCode} 00 00 00 00`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Mot de passe"
            type="password"
            required
            leftIcon={<Lock className="size-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Confirmer"
            type="password"
            required
            leftIcon={<Lock className="size-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Input
          label="Code de parrainage"
          required
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          disabled={referralLocked}
          placeholder="PRINCE123"
          hint={referralLocked ? "Rempli automatiquement depuis votre lien d'invitation" : "Demandez le code à la personne qui vous a invité"}
        />

        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            J'accepte les{" "}
            <Link to="/terms" className="text-primary hover:underline" target="_blank">
              Conditions d'utilisation
            </Link>
          </label>
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={acceptPrivacy}
              onChange={(e) => setAcceptPrivacy(e.target.checked)}
            />
            J'accepte la{" "}
            <Link to="/privacy" className="text-primary hover:underline" target="_blank">
              Politique de confidentialité
            </Link>
          </label>
        </div>

        <Button type="submit" fullWidth loading={loading}>
          Créer mon compte
        </Button>
      </form>
    </AuthCard>
  );
}
