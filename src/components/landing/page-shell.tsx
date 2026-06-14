import { LandingGridOverlay } from "@/components/landing/grid-overlay";

export function LandingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl overflow-x-clip">
      <div className="relative flex min-h-screen min-w-0 flex-col">
        <LandingGridOverlay />
        <div className="relative z-10 flex min-h-screen min-w-0 flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
