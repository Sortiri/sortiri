/** Footer link groups — aligned with sortiri-content marketing nav (simplified routes). */
export const signUpHref = "/sign-up";

export const HEADER_NAV_LINKS = [
  { href: "/", label: "Product" },
  { href: "/pricing", label: "Pricing" },
] as const;

export const FOOTER_LINK_GROUPS = [
  {
    label: "Product",
    items: [
      { href: "/pricing", label: "Pricing" },
      { href: "#", label: "Enterprise" },
      { href: "#", label: "Contact Sales" },
      { href: signUpHref, label: "Sign up" },
    ],
  },
  {
    label: "Company",
    items: [
      { href: "#", label: "About" },
      { href: "#", label: "Careers" },
      { href: "#", label: "Press" },
      { href: "#", label: "Contact" },
    ],
  },
  {
    label: "Initiatives",
    items: [
      { href: "#", label: "Blog" },
      { href: "#", label: "Documentation" },
      { href: "#", label: "Partners" },
      { href: "#", label: "Research" },
    ],
  },
  {
    label: "Connect",
    items: [
      { href: "https://www.tiktok.com/@sortiri", label: "TikTok" },
      { href: "https://www.linkedin.com/company/sortiri", label: "LinkedIn" },
      { href: "https://x.com/sortiri", label: "X" },
      { href: "https://www.instagram.com/sortiri", label: "Instagram" },
    ],
  },
  {
    label: "Legal",
    items: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;
