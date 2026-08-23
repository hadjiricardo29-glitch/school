import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { AuthCard } from "@/components/shared/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { isStaffUser, loginUser } from "@/services/auth";
import { useT } from "@/i18n/useT";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT().login;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await loginUser(email, password);
      const stateFrom = (location.state as { from?: Location })?.from?.pathname;
      if (stateFrom) {
        navigate(stateFrom, { replace: true });
      } else {
        const staff = user ? await isStaffUser(user.id) : false;
        navigate(staff ? "/admin" : "/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.noAccount}{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            {t.createAccount}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Input
          label={t.email}
          type="email"
          required
          leftIcon={<Mail className="size-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
        />
        <Input
          label={t.password}
          type="password"
          required
          leftIcon={<Lock className="size-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" fullWidth loading={loading}>
          {t.submit}
        </Button>
      </form>
    </AuthCard>
  );
}
