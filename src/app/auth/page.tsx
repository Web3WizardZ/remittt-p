export const dynamic = "force-dynamic";
export const revalidate = 0;

import AuthClient from "./AuthClient";

export default function Page() {
  return <AuthClient />;
}
