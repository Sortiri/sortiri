import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { PolarisSignInForm } from "@/components/auth/polaris-sign-in-form";

export default function SignInPage() {
  return (
    <AuthPageShell legal="sign-in">
      <PolarisSignInForm />
    </AuthPageShell>
  );
}
