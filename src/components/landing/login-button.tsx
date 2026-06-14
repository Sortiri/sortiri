import Link from "next/link";
import { landing } from "@/components/landing/typography";

const SIGN_IN_HREF = "/sign-in";

export function LoginButton({ className = "" }: { className?: string }) {
  return (
    <Link href={SIGN_IN_HREF} className={`${landing.buttonSecondary} ${className}`}>
      Log in
    </Link>
  );
}
