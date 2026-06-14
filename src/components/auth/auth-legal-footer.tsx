import Link from "next/link";

type AuthLegalFooterProps = {
  variant: "sign-in" | "sign-up";
};

export function AuthLegalFooter({ variant }: AuthLegalFooterProps) {
  const lead =
    variant === "sign-up"
      ? "By creating an account, you agree to our"
      : "By signing in, you agree to our";

  return (
    <footer className="auth-page__legal">
      <p>
        {lead}{" "}
        <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </footer>
  );
}
