export interface NavItem {
  label: string;
  href: string;
}

export interface NavSection {
  items: NavItem[];
  divider?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/" },
      { label: "CNG Operations", href: "/cng" },
      { label: "Main Operations", href: "/operations" },
      { label: "Daily Reports", href: "/operations/daily-reports" },
      { label: "Commercial", href: "/commercial" },
      { label: "Drivers", href: "/drivers" },
    ],
  },
  {
    divider: true,
    items: [
      { label: "Business Outcomes", href: "/outcomes" },
      { label: "Intelligence", href: "/intelligence" },
      { label: "Needs Attention", href: "/attention" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    divider: true,
    items: [{ label: "Settings", href: "/settings" }],
  },
];