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
import { useT } from "@/i18n/useT";

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const t = useT().register;

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
      setError(t.errorPasswordMismatch);
      return;
    }
    if (password.length < 8) {
      setError(t.errorPasswordLength);
      return;
    }
    if (!acceptTerms || !acceptPrivacy) {
      setError(t.errorAcceptTerms);
      return;
    }
    if (!referralCode.trim()) {
      setError(t.errorReferralRequired);
      return;
    }
    if (referralCode.trim().toUpperCase() === username.trim().toUpperCase()) {
      setError(t.errorSelfReferral);
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
      <AuthCard title={t.checkEmailTitle}>
        <Alert tone="success">
          {t.checkEmailBody} (<strong>{email}</strong>)
        </Alert>
        <Link to="/login" className="mt-6 block">
          <Button fullWidth>{t.goToLogin}</Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.alreadyAccount}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t.login}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-3">
          <Input label={t.firstName} required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label={t.lastName} required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <Input
          label={t.username}
          required
          leftIcon={<User className="size-4" />}
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
          placeholder="prince123"
          hint={t.usernameHint}
        />

        <Input
          label={t.email}
          type="email"
          required
          leftIcon={<Mail className="size-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t.country}
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
          <Input
            label={t.phone}
            required
            leftIcon={<Phone className="size-4" />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={`${selectedCountry.phoneCode} 00 00 00 00`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t.password}
            type="password"
            required
            leftIcon={<Lock className="size-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label={t.confirm}
            type="password"
            required
            leftIcon={<Lock className="size-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Input
          label={t.referralCode}
          required
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          disabled={referralLocked}
          placeholder="PRINCE123"
          hint={referralLocked ? t.referralHintLocked : t.referralHint}
        />

        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            {t.acceptTermsPrefix}{" "}
            <Link to="/terms" className="text-primary hover:underline" target="_blank">
              {t.terms}
            </Link>
          </label>
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={acceptPrivacy}
              onChange={(e) => setAcceptPrivacy(e.target.checked)}
            />
            {t.acceptPrivacyPrefix}{" "}
            <Link to="/privacy" className="text-primary hover:underline" target="_blank">
              {t.privacy}
            </Link>
          </label>
        </div>

        <Button type="submit" fullWidth loading={loading}>
          {t.submit}
        </Button>
      </form>
    </AuthCard>
  );
}
