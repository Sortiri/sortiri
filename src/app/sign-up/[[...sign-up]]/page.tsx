import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-6 py-12">
      <SignUp />
    </main>
  );
}
