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
      { label: "Drivers", href: "/drivers" },
    ],
  },
  {
    divider: true,
    items: [
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