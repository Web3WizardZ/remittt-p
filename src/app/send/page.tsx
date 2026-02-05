import { Suspense } from "react";
import SendClient from "./SendClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SendClient />
    </Suspense>
  );
}
