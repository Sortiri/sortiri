import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { PolarisSignUpFormShell } from "@/components/auth/polaris-sign-up-form-shell";

export default function SignUpPage() {
  return (
    <AuthPageShell legal="sign-up">
      <PolarisSignUpFormShell />
    </AuthPageShell>
  );
}
