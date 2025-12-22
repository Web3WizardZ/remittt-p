import { Suspense } from "react";
import DepositStatusClient from "./DepositStatusClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <DepositStatusClient />
    </Suspense>
  );
}
