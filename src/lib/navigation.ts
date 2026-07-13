export function isActiveAppRoute(pathname: string | null, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname?.startsWith(`${href}/`);
}
