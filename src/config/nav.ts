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
      { label: "Profitability Analysis", href: "/commercial/orders/profitability" },
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

/**
 * Picks the single nav item that should be highlighted / titled: the
 * one whose href is the LONGEST prefix of the current path.
 *
 * Shared by Sidebar (which item to highlight) and Topbar (which label
 * to show as the page title). A plain `pathname.startsWith` per item,
 * checked in array order, would match "/commercial" before the more
 * specific "/commercial/orders/profitability" and the more specific
 * page would never win.
 */
export function resolveActiveHref(
  pathname: string,
  hrefs: string[]
): string | null {
  let best: string | null = null;

  for (const href of hrefs) {
    const matches =
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(`${href}/`);

    if (matches && (best === null || href.length > best.length)) {
      best = href;
    }
  }

  return best;
}