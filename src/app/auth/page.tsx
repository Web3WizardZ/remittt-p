import { Suspense } from "react";
import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AuthClient />
    </Suspense>
  );
}
