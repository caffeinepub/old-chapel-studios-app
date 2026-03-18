import { useInternetIdentity } from "@/hooks/useInternetIdentity";

const ADMIN_PRINCIPAL =
  "ulyt5-slv4a-xrfbx-seije-74i6r-4nkkh-ydqng-hgdb2-r3tlc-tkvp4-hae";

export function useIsAdmin(): { isAdmin: boolean } {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();
  return { isAdmin: principal === ADMIN_PRINCIPAL };
}
