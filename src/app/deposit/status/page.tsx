import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

const DepositStatusClient = dynamicImport(() => import("./DepositStatusClient"), {
  ssr: false,
});

export default function Page() {
  return <DepositStatusClient />;
}
