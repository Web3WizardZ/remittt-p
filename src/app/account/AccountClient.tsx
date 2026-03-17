// src/app/account/AccountClient.tsx
"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic, solanaRpcUrl } from "@/lib/magic";
import { getEvmAddressSafe, switchEvmChainSafe } from "@/lib/magicSession";
import { ethers } from "ethers";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  UserRound,
  RefreshCcw,
  ChevronDown,
  Landmark,
  Smartphone,
  CreditCard,
  Gift,
  MessageSquare,
  Coins,
  X,
  CheckCircle2,
  Clock3,
  Copy,
} from "lucide-react";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatUSD(n: number | null) {
  if (!Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number(n) >= 1000 ? 0 : 2,
  }).format(Number(n));
}

function formatNative(n: number | null, symbol: string) {
  if (!Number.isFinite(Number(n))) return `— ${symbol}`;
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number(n) >= 1 ? 4 : 6,
  }).format(Number(n))} ${symbol}`;
}

function formatTokenText(v?: string | number | null, symbol = "") {
  const num = Number(v ?? 0);
  if (!Number.isFinite(num)) return `— ${symbol}`.trim();
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: num >= 1 ? 6 : 8,
  }).format(num)}${symbol ? ` ${symbol}` : ""}`;
}

function formatDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getOnrampOrderStatusLabel(status?: number | string) {
  const code = Number(status);
  if (Number.isNaN(code)) return "—";

  const map: Record<number, string> = {
    [-4]: "Amount mismatch",
    [-3]: "Bank and KYC name mismatch",
    [-2]: "Transaction abandoned",
    [-1]: "Transaction timed out",
    0: "Transaction created",
    1: "Reference ID claimed",
    2: "Deposit secured",
    3: "Crypto purchased",
    4: "Withdrawal complete",
    5: "Webhook sent",
    11: "Order placement initiated",
    12: "Purchasing crypto",
    13: "Crypto purchased",
    14: "Withdrawal initiated",
    15: "Withdrawal complete",
    16: "Webhook sent",
  };

  return map[code] ?? `Status ${code}`;
}

type Phase =
  | "init"
  | "check-login"
  | "get-info"
  | "validate"
  | "get-address"
  | "done";

type NetworkId = "eth" | "base" | "op" | "avax" | "celo" | "arb" | "sol";

type Network = {
  id: NetworkId;
  name: string;
  chainId: number;
  nativeSymbol: string;
};

type SendRailId =
  | "bank"
  | "mobile"
  | "card"
  | "gift"
  | "sms"
  | "cross-chain";

type CrossChainDestination =
  | "ETHEREUM_MAINNET"
  | "BASE_MAINNET"
  | "OPTIMISM_MAINNET"
  | "ARBITRUM_MAINNET"
  | "AVALANCHE_MAINNET"
  | "POLYGON_MAINNET"
  | "BSC_MAINNET";

type CrossQuote = {
  ok: true;
  sourceChain: string;
  destinationChain: string;
  token: string;
  sourceTokenAddress: string;
  destinationTokenAddress: string;
  decimals: number;
  amount: string;
  amountRaw: string;
  totalFeesRaw: string;
  totalFeesFormatted: string;
  bridge: "ACROSS" | "CCTP" | "GATEWAY" | "RHINOFI" | null;
  supportedBridges: string[];
  bridgeAddress: string;
  bridgeExtraData: string;
};

type CrossIntent = {
  ok: true;
  id: number;
  intentAddress: string;
  destinationIntentAddress: string;
  sourceChain: string;
  destinationChain: string;
  token: string;
  tokenDecimals: number;
  fundingAmountRaw: string;
  fundingAmountFormatted: string;
  feesRaw: string;
  feesFormatted: string;
  status: string;
  recipient: string;
  refundAddress: string;
  expiresAt: string;
  txHash: string | null;
  createdAt: string;
  updatedAt: string;
};

type OnrampTxData = {
  actualCryptoAmount?: number | string;
  actualPrice?: number | string;
  chainId?: number | string;
  clientFee?: number | string;
  coinId?: number | string;
  createdAt?: string;
  expectedCryptoAmount?: number | string;
  expectedPrice?: number | string;
  fiatAmount?: number | string;
  fiatType?: number | string;
  gasFee?: number | string;
  gatewayFee?: number | string;
  kycNeeded?: number | string;
  merchantRecognitionId?: string | null;
  onRampFee?: number | string;
  orderId?: number | string;
  orderStatus?: number | string;
  paymentMethod?: string;
  referenceId?: string;
  transactionHash?: string;
  updatedAt?: string;
  walletAddress?: string;
  cryptoAmount?: number | string;
  coinRate?: number | string;
};

const NETWORKS: Network[] = [
  { id: "eth", name: "Ethereum", chainId: 1, nativeSymbol: "ETH" },
  { id: "base", name: "Base", chainId: 8453, nativeSymbol: "ETH" },
  { id: "op", name: "Optimism", chainId: 10, nativeSymbol: "ETH" },
  { id: "avax", name: "Avalanche", chainId: 43114, nativeSymbol: "AVAX" },
  { id: "celo", name: "Celo", chainId: 42220, nativeSymbol: "CELO" },
  { id: "arb", name: "Arbitrum", chainId: 42161, nativeSymbol: "ETH" },
  { id: "sol", name: "Solana", chainId: 999, nativeSymbol: "SOL" },
];

const SEND_RAILS: Array<{
  id: SendRailId;
  title: string;
  subtitle: string;
  icon: any;
  enabled: boolean;
}> = [
  {
    id: "bank",
    title: "Bank",
    subtitle: "Coming soon",
    icon: Landmark,
    enabled: false,
  },
  {
    id: "mobile",
    title: "Mobile money",
    subtitle: "Coming soon",
    icon: Smartphone,
    enabled: false,
  },
  {
    id: "card",
    title: "Debit Card",
    subtitle: "Coming soon",
    icon: CreditCard,
    enabled: false,
  },
  {
    id: "gift",
    title: "Gift Card",
    subtitle: "Coming soon",
    icon: Gift,
    enabled: false,
  },
  {
    id: "sms",
    title: "SMS",
    subtitle: "Coming soon",
    icon: MessageSquare,
    enabled: false,
  },
  {
    id: "cross-chain",
    title: "Crypto Cross Chain",
    subtitle: "Live now",
    icon: Coins,
    enabled: true,
  },
];

const DESTINATION_CHAINS: Array<{
  value: CrossChainDestination;
  label: string;
}> = [
  { value: "ETHEREUM_MAINNET", label: "Ethereum" },
  { value: "BASE_MAINNET", label: "Base" },
  { value: "OPTIMISM_MAINNET", label: "Optimism" },
  { value: "ARBITRUM_MAINNET", label: "Arbitrum" },
  { value: "AVALANCHE_MAINNET", label: "Avalanche" },
  { value: "POLYGON_MAINNET", label: "Polygon" },
  { value: "BSC_MAINNET", label: "BNB Chain" },
];

export default function AccountClient() {
  const router = useRouter();

  const [magicInitError, setMagicInitError] = useState<string>("");

  const magic = useMemo(() => {
    try {
      return getMagic();
    } catch (e: any) {
      setMagicInitError(e?.message ?? "Failed to initialize Magic");
      return null as any;
    }
  }, []);

  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("init");

  const [network, setNetwork] = useState<Network>(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("re_network")
        : null;
    const found = saved ? NETWORKS.find((n) => n.id === saved) : null;
    return found ?? NETWORKS[0];
  });

  const [switching, setSwitching] = useState(false);

  const [address, setAddress] = useState("");
  const [solAddress, setSolAddress] = useState("");
  const [email, setEmail] = useState("");
  const [issuer, setIssuer] = useState("");

  const [copied, setCopied] = useState(false);
  const [linkStatus, setLinkStatus] = useState<
    "idle" | "linking" | "linked" | "failed"
  >("idle");

  const [syncError, setSyncError] = useState("");
  const [notice, setNotice] = useState("");

  const [balLoading, setBalLoading] = useState(false);
  const [balError, setBalError] = useState("");
  const [nativeAmount, setNativeAmount] = useState<number | null>(null);
  const [usdAmount, setUsdAmount] = useState<number | null>(null);
  const [nativePriceUsd, setNativePriceUsd] = useState<number | null>(null);

  const [openingWidget, setOpeningWidget] = useState<
    null | "receive" | "deposit"
  >(null);

  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [crossChainOpen, setCrossChainOpen] = useState(false);
  const [crossAmount, setCrossAmount] = useState("");
  const [crossRecipient, setCrossRecipient] = useState("");
  const [crossDestination, setCrossDestination] =
    useState<CrossChainDestination>("ARBITRUM_MAINNET");
  const [crossLoading, setCrossLoading] = useState(false);
  const [crossError, setCrossError] = useState("");
  const [crossQuote, setCrossQuote] = useState<CrossQuote | null>(null);
  const [crossIntent, setCrossIntent] = useState<CrossIntent | null>(null);

  const [onrampStage, setOnrampStage] = useState("");
  const [onrampError, setOnrampError] = useState("");
  const [onrampTx, setOnrampTx] = useState<OnrampTxData | null>(null);

  const onrampInstanceRef = useRef<any | null>(null);

  const brandGradient =
    "linear-gradient(135deg, #4f46e5 0%, #a855f7 45%, #ec4899 100%)";

  const displayAddress = network.id === "sol" ? solAddress : address;
  const crossChainSupportedSource = ["eth", "base", "op", "avax", "arb"].includes(
    network.id
  );
  const onrampSupported = network.id !== "sol";
  const onrampAppId = Number(process.env.NEXT_PUBLIC_ONRAMP_APP_ID || 0);
  const onrampSandbox =
    String(process.env.NEXT_PUBLIC_ONRAMP_SANDBOX || "").toLowerCase() ===
    "true";

  const flashNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3200);
  };

  const handleLogout = async () => {
    if (!magic) return;
    try {
      onrampInstanceRef.current?.close?.();
    } catch {}
    await magic.user.logout();
    router.replace("/auth");
  };

  const handleCopy = async () => {
    try {
      if (!displayAddress) return;
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const copyText = async (value: string, message = "Copied") => {
    try {
      await navigator.clipboard.writeText(value);
      flashNotice(message);
    } catch {}
  };

  const resetCrossChainState = () => {
    setCrossError("");
    setCrossQuote(null);
    setCrossIntent(null);
  };

  const openSendMenu = () => {
    setSendMenuOpen(true);
  };

  const openCrossChainRail = () => {
    setSendMenuOpen(false);

    if (!crossChainSupportedSource) {
      flashNotice("Crypto Cross Chain is currently available on supported EVM networks.");
      return;
    }

    if (!address) {
      flashNotice("Wallet address not available yet.");
      return;
    }

    if (!crossRecipient) {
      setCrossRecipient(address);
    }

    resetCrossChainState();
    setCrossChainOpen(true);
  };

  const loadBalance = async () => {
    if (!magic) return;

    setBalLoading(true);
    setBalError("");

    try {
      if (network.id === "sol") {
        if (!solanaRpcUrl) {
          throw new Error("Missing NEXT_PUBLIC_SOLANA_RPC_URL");
        }

        const activeSolAddress =
          solAddress || (await (magic as any)?.solana?.getPublicAddress?.());

        if (!activeSolAddress) {
          throw new Error("Solana wallet address not available");
        }

        setSolAddress(activeSolAddress);

        const connection = new Connection(solanaRpcUrl, "confirmed");
        const lamports = await connection.getBalance(
          new PublicKey(activeSolAddress),
          "confirmed"
        );
        const sol = lamports / LAMPORTS_PER_SOL;

        const priceRes = await fetch("/api/price/native?chainId=999", {
          cache: "no-store",
        });
        const priceJson = await priceRes.json().catch(() => ({}));

        if (!priceRes.ok) {
          throw new Error(priceJson?.error ?? "Price unavailable");
        }

        const price = Number(priceJson?.usd ?? 0);

        setNativeAmount(sol);
        setNativePriceUsd(price || null);
        setUsdAmount(price ? sol * price : null);
        return;
      }

      if (!address) {
        throw new Error("Wallet address not available");
      }

      await switchEvmChainSafe(magic, network.chainId);

      const provider = new ethers.BrowserProvider((magic as any).rpcProvider);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      const balWei = await provider.getBalance(signerAddress);
      const native = Number(ethers.formatEther(balWei));

      const priceRes = await fetch(
        `/api/price/native?chainId=${network.chainId}`,
        { cache: "no-store" }
      );
      const priceJson = await priceRes.json().catch(() => ({}));

      if (!priceRes.ok) {
        throw new Error(priceJson?.error ?? "Price unavailable");
      }

      const price = Number(priceJson?.usd ?? 0);
      const usd = native * price;

      setNativeAmount(native);
      setNativePriceUsd(price);
      setUsdAmount(usd);
    } catch (e: any) {
      setBalError(e?.message ?? "Could not load balance");
      setNativeAmount(null);
      setUsdAmount(null);
      setNativePriceUsd(null);
    } finally {
      setBalLoading(false);
    }
  };

  const openAddressQR = async () => {
    if (!magic || openingWidget) return;

    if (network.id === "sol") {
      flashNotice("QR widget is currently available on EVM networks.");
      return;
    }

    setOpeningWidget("receive");

    try {
      await switchEvmChainSafe(magic, network.chainId);
      await (magic as any).wallet?.showAddress?.();
    } catch (e: any) {
      flashNotice(e?.message ?? "Could not open QR");
    } finally {
      setOpeningWidget(null);
    }
  };

  const openOnRamp = async () => {
    if (openingWidget) return;

    if (!onrampSupported) {
      flashNotice("Deposit is currently available on EVM networks.");
      return;
    }

    if (!address) {
      flashNotice("Wallet address not available yet.");
      return;
    }

    if (!onrampAppId) {
      flashNotice("Missing NEXT_PUBLIC_ONRAMP_APP_ID.");
      return;
    }

    setOpeningWidget("deposit");
    setOnrampError("");
    setOnrampStage("Opening deposit widget…");

    try {
      try {
        onrampInstanceRef.current?.close?.();
      } catch {}

      onrampInstanceRef.current = null;

      const sdkModule = await import("@onramp.money/onramp-web-sdk");
      const OnrampWebSDK = (sdkModule as any)?.OnrampWebSDK;

      if (!OnrampWebSDK) {
        throw new Error("Onramp SDK failed to load.");
      }

      const networkMap: Record<Exclude<NetworkId, "sol">, string> = {
        eth: "ethereum",
        base: "base",
        op: "optimism",
        avax: "avalanche",
        celo: "celo",
        arb: "arbitrum",
      };

      const preferredNetwork =
        network.id === "sol" ? "polygon" : networkMap[network.id];

      const instance = new OnrampWebSDK({
        appId: onrampAppId,
        walletAddress: address,
        flowType: 1,
        coinCode: "USDT",
        network: preferredNetwork,
        fiatType: 17,
        fiatAmount: 100,
        lang: "en",
        sandbox: onrampSandbox,
        redirectUrl:
          typeof window !== "undefined"
            ? `${window.location.origin}/account`
            : undefined,
        theme: {
          lightMode: {
            baseColor: "#6d28d9",
            inputRadius: "16px",
            buttonRadius: "16px",
          },
          darkMode: {
            baseColor: "#8b5cf6",
            inputRadius: "16px",
            buttonRadius: "16px",
          },
          default: "lightMode",
        },
      });

      instance.on("WIDGET_EVENTS", (e: any) => {
        const eventType = String(e?.type || "");

        if (eventType === "ONRAMP_WIDGET_READY") {
          setOnrampStage("Deposit widget ready");
        } else if (eventType === "ONRAMP_WIDGET_LOGIN_SUCCESS") {
          setOnrampStage("Signed in to deposit flow");
        } else if (eventType === "ONRAMP_WIDGET_NAVIGATION") {
          setOnrampStage("Deposit flow updated");
        } else if (eventType === "ONRAMP_WIDGET_CLOSE_REQUEST_CONFIRMED") {
          setOnrampStage("Deposit widget closed");
          setOpeningWidget(null);
          onrampInstanceRef.current = null;
          void loadBalance();
        } else if (eventType === "ONRAMP_WIDGET_FAILED") {
          const msg =
            e?.data?.message ||
            e?.data?.error ||
            "Deposit widget failed to load.";
          setOnrampError(String(msg));
          setOnrampStage("");
          setOpeningWidget(null);
          onrampInstanceRef.current = null;
        } else if (eventType === "ONRAMP_WIDGET_CONTENT_COPIED") {
          flashNotice("Copied from deposit widget.");
        }
      });

      instance.on("KYC_EVENTS", (e: any) => {
        const eventType = String(e?.type || "");

        if (eventType === "ONRAMP_KYC_READY") {
          setOnrampStage("KYC ready");
        } else if (eventType === "ONRAMP_KYC_PENDING") {
          setOnrampStage("KYC pending review");
        } else if (eventType === "ONRAMP_KYC_REJECTED") {
          setOnrampError("KYC was rejected. Please review your submitted details.");
        } else if (eventType === "ONRAMP_KYC_ERROR") {
          const msg =
            e?.data?.message || e?.data?.error || "KYC failed to load.";
          setOnrampError(String(msg));
        } else if (eventType === "ONRAMP_KYC_CLOSE") {
          setOnrampStage("KYC flow closed");
        }
      });

      instance.on("TX_EVENTS", (e: any) => {
        const eventType = String(e?.type || "");
        const data = (e?.data || {}) as OnrampTxData;

        if (eventType === "ONRAMP_WIDGET_TX_INIT") {
          setOnrampStage("Payment details ready");
          setOnrampTx(data);
        } else if (eventType === "ONRAMP_WIDGET_TX_FINDING") {
          setOnrampStage("Finding your deposit…");
          setOnrampTx((prev) => ({ ...(prev || {}), ...data }));
        } else if (eventType === "ONRAMP_WIDGET_TX_PURCHASING") {
          setOnrampStage("Purchasing crypto…");
          setOnrampTx((prev) => ({ ...(prev || {}), ...data }));
        } else if (eventType === "ONRAMP_WIDGET_TX_SENDING") {
          setOnrampStage("Sending crypto to your wallet…");
          setOnrampTx((prev) => ({ ...(prev || {}), ...data }));
        } else if (eventType === "ONRAMP_WIDGET_TX_SENT") {
          setOnrampStage("Crypto sent onchain");
          setOnrampTx((prev) => ({ ...(prev || {}), ...data }));
        } else if (eventType === "ONRAMP_WIDGET_TX_COMPLETED") {
          setOnrampStage("Deposit completed");
          setOnrampTx((prev) => ({ ...(prev || {}), ...data }));
          flashNotice("Deposit completed.");
          void loadBalance();
        } else if (eventType === "ONRAMP_WIDGET_TX_SELLING") {
          setOnrampStage("Processing transaction…");
          setOnrampTx((prev) => ({ ...(prev || {}), ...data }));
        }
      });

      onrampInstanceRef.current = instance;
      instance.show();
    } catch (e: any) {
      setOnrampError(e?.message ?? "Could not open deposit widget.");
      setOnrampStage("");
      onrampInstanceRef.current = null;
    } finally {
      setOpeningWidget(null);
    }
  };

  const requestCrossChainQuote = async () => {
    try {
      if (!crossChainSupportedSource) {
        throw new Error("Switch to Ethereum, Base, Optimism, Arbitrum or Avalanche.");
      }

      if (!crossAmount || Number(crossAmount) <= 0) {
        throw new Error("Enter a valid USDC amount.");
      }

      if (!crossRecipient || !ethers.isAddress(crossRecipient)) {
        throw new Error("Enter a valid recipient address.");
      }

      setCrossLoading(true);
      setCrossError("");
      setCrossQuote(null);
      setCrossIntent(null);

      const res = await fetch("/api/chainrails/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNetworkId: network.id,
          destinationChain: crossDestination,
          amount: crossAmount,
          recipient: crossRecipient,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to fetch quote");
      }

      setCrossQuote(json);
    } catch (e: any) {
      setCrossError(e?.message ?? "Could not fetch quote");
    } finally {
      setCrossLoading(false);
    }
  };

  const createCrossChainIntent = async () => {
    try {
      if (!address) {
        throw new Error("Wallet address not available.");
      }

      if (!crossQuote) {
        throw new Error("Get a quote first.");
      }

      setCrossLoading(true);
      setCrossError("");

      const res = await fetch("/api/chainrails/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNetworkId: network.id,
          destinationChain: crossDestination,
          amount: crossAmount,
          sender: address,
          recipient: crossRecipient,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to create intent");
      }

      setCrossIntent(json);
      flashNotice("Cross-chain intent created.");
    } catch (e: any) {
      setCrossError(e?.message ?? "Could not create intent");
    } finally {
      setCrossLoading(false);
    }
  };

  const refreshCrossChainIntent = async () => {
    try {
      if (!crossIntent?.intentAddress) return;

      setCrossLoading(true);
      setCrossError("");

      const res = await fetch(
        `/api/chainrails/intent-status?address=${encodeURIComponent(
          crossIntent.intentAddress
        )}`,
        { cache: "no-store" }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to refresh intent");
      }

      setCrossIntent(json);
      flashNotice("Intent status refreshed.");
    } catch (e: any) {
      setCrossError(e?.message ?? "Could not refresh intent");
    } finally {
      setCrossLoading(false);
    }
  };

  const openWalletForFunding = async () => {
    try {
      if (!magic) return;
      if (!crossIntent?.intentAddress) {
        throw new Error("Create an intent first.");
      }

      await copyText(
        crossIntent.intentAddress,
        "Intent address copied. Opened wallet send."
      );

      await switchEvmChainSafe(magic, network.chainId);
      await (magic as any).wallet?.showSendTokensUI?.();
    } catch (e: any) {
      flashNotice(e?.message ?? "Could not open wallet send");
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!magic) {
          setSyncError(magicInitError || "Magic is not initialized");
          return;
        }

        setPhase("check-login");
        const loggedIn = await magic.user.isLoggedIn();

        if (!loggedIn) {
          if (!cancelled) router.replace("/auth");
          return;
        }

        setPhase("get-info");

        try {
          const info = await magic.user.getInfo();
          const em = (info as any)?.email as string | undefined;
          if (!cancelled) setEmail(em ?? "");
        } catch {}

        const idToken = await magic.user.getIdToken();

        setPhase("validate");

        let nextIssuer = "";

        try {
          const res = await fetch("/api/auth/magic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`Auth failed: ${res.status} ${txt}`);
          }

          const data = await res.json().catch(() => ({}));
          nextIssuer = String(data?.issuer ?? "");

          if (!cancelled) {
            setIssuer(nextIssuer);
          }
        } catch (e: any) {
          if (!cancelled) {
            setSyncError(e?.message ?? "Failed to validate session");
          }
        }

        setPhase("get-address");

        const evmAddr = await getEvmAddressSafe(magic);
        if (!cancelled) setAddress(evmAddr);

        try {
          const sAddr = await (magic as any)?.solana?.getPublicAddress?.();
          if (!cancelled && sAddr) setSolAddress(sAddr);
        } catch {}

        if (cancelled) return;

        if (evmAddr && nextIssuer) {
          try {
            setLinkStatus("linking");
            localStorage.setItem(`re_wallet_${nextIssuer}`, evmAddr);
            setLinkStatus("linked");
          } catch {
            setLinkStatus("failed");
          }

          fetch("/api/account/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, address: evmAddr }),
          }).catch(() => {});
        }

        if (!cancelled && evmAddr && !crossRecipient) {
          setCrossRecipient(evmAddr);
        }

        setPhase("done");
      } catch (e: any) {
        if (!cancelled) {
          setSyncError(e?.message ?? "Unknown error on account page");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [magic, magicInitError, router, crossRecipient]);

  useEffect(() => {
    if (!magic) return;
    if (network.id !== "sol" && !address) return;
    if (network.id === "sol" && !solAddress) return;

    (async () => {
      try {
        setSwitching(true);
        setSyncError("");
        setBalError("");

        if (typeof window !== "undefined") {
          window.localStorage.setItem("re_network", network.id);
        }

        if (network.id !== "sol") {
          await switchEvmChainSafe(magic, network.chainId);
        }

        await loadBalance();
      } catch (e: any) {
        setSyncError(e?.message ?? "Network switch failed");
      } finally {
        setSwitching(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network.id, address, solAddress]);

  useEffect(() => {
    return () => {
      try {
        onrampInstanceRef.current?.close?.();
      } catch {}
      onrampInstanceRef.current = null;
    };
  }, []);

  const showLinking = issuer && linkStatus === "linking";
  const showConnected = issuer && linkStatus === "linked";
  const showConnFailed = issuer && linkStatus === "failed";

  if (!ready) {
    const title =
      phase === "check-login"
        ? "Checking your session…"
        : phase === "get-info"
        ? "Preparing your account…"
        : phase === "validate"
        ? "Securing your sign-in…"
        : phase === "get-address"
        ? "Setting up your wallet…"
        : "Loading your account…";

    const subtitle =
      phase === "check-login"
        ? "Just a moment while we verify you."
        : phase === "get-info"
        ? "Fetching your profile details."
        : phase === "validate"
        ? "Confirming your secure session."
        : phase === "get-address"
        ? "Preparing your embedded wallet."
        : "Almost there.";

    return (
      <main className="relative min-h-screen">
        <AnimatedBackground />
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
          <div className="re-card rounded-3xl p-7">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
                <Image
                  src="/logo.png"
                  alt="RemittEase"
                  width={48}
                  height={48}
                  className="h-full w-full object-contain p-2"
                  priority
                />
              </div>
              <div>
                <div className="text-lg font-semibold leading-tight">
                  RemittEase
                </div>
                <div className="text-xs re-subtle">Getting things ready</div>
              </div>
            </div>

            <div className="mt-7">
              <div className="text-2xl font-semibold leading-tight tracking-tight">
                {title}
              </div>
              <div className="mt-2 text-sm re-subtle">{subtitle}</div>
            </div>

            {(magicInitError || syncError) && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-semibold">We hit a snag</div>
                <div className="mt-1">
                  Please refresh the page. If it keeps happening, sign out and
                  try again.
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                    style={{ background: "var(--re-primary)" }}
                  >
                    Refresh
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full rounded-2xl border border-[var(--re-border)] bg-white/60 px-4 py-3 text-sm font-semibold hover:bg-white/80"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  const headerSub = email ? `Signed in as ${email}` : "Signed in";

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
              <Image
                src="/logo.png"
                alt="RemittEase"
                width={40}
                height={40}
                className="h-full w-full object-contain p-2"
                priority
              />
            </div>
            <div>
              <div className="text-lg font-semibold">Account</div>
              <div className="flex items-center gap-2 text-sm text-[var(--re-muted)]">
                <UserRound className="h-4 w-4" />
                <span className="truncate max-w-[240px]">{headerSub}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white/90"
          >
            Logout
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-[var(--re-border)] bg-white/60 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[var(--re-muted)]">
              Network {switching ? "• switching…" : ""}
            </div>
            <div className="relative">
              <select
                value={network.id}
                onChange={(e) => {
                  const next = NETWORKS.find((n) => n.id === e.target.value);
                  if (next) {
                    setNetwork(next);
                    resetCrossChainState();
                    setOnrampError("");
                    setOnrampStage("");
                  }
                }}
                className="appearance-none rounded-xl border border-[var(--re-border)] bg-white/80 px-3 py-2 pr-9 text-sm font-semibold"
                disabled={switching}
              >
                {NETWORKS.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--re-muted)]" />
            </div>
          </div>
        </div>

        {(syncError || showLinking || showConnected || showConnFailed) && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--re-border)] bg-white/50 px-3 py-2 text-[11px]">
            <div className="text-[var(--re-muted)]">
              {syncError
                ? "Sync issue — some features may be limited."
                : showConnFailed
                ? "Connection issue — refresh."
                : showLinking
                ? "Connecting…"
                : "Connected"}
            </div>

            {syncError || showConnFailed ? (
              <button
                onClick={() => window.location.reload()}
                className="rounded-full border border-[var(--re-border)] bg-white/70 px-2 py-0.5 font-semibold hover:bg-white/90"
              >
                Refresh
              </button>
            ) : (
              <span
                className="rounded-full px-2 py-0.5 font-semibold text-white"
                style={{ background: brandGradient }}
              >
                Connected
              </span>
            )}
          </div>
        )}

        {notice ? (
          <div className="mt-3 rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-2 text-xs text-[var(--re-muted)]">
            {notice}
          </div>
        ) : null}

        {onrampStage ? (
          <div className="mt-3 rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-2 text-xs text-[var(--re-muted)]">
            Deposit status:{" "}
            <span className="font-semibold text-[var(--re-text)]">
              {onrampStage}
            </span>
          </div>
        ) : null}

        {onrampError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {onrampError}
          </div>
        ) : null}

        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[var(--re-muted)]">
                Account balance
              </div>

              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {balLoading ? "Loading…" : formatUSD(usdAmount)}
              </div>

              <div className="mt-1 text-xs text-[var(--re-muted)]">
                {balLoading
                  ? "Fetching latest rate"
                  : `${formatNative(nativeAmount, network.nativeSymbol)} • ${
                      nativePriceUsd !== null
                        ? `$${nativePriceUsd.toFixed(2)} / ${network.nativeSymbol}`
                        : "—"
                    }`}
              </div>

              {balError ? (
                <div className="mt-2 text-xs text-red-700">{balError}</div>
              ) : null}
            </div>

            <button
              onClick={loadBalance}
              disabled={balLoading}
              className="rounded-2xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: brandGradient }}
              title="Refresh balance"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <button
            onClick={openSendMenu}
            disabled={switching}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90 disabled:opacity-60"
          >
            <ArrowUpRight className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Send</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">
              Choose rail
            </div>
          </button>

          <button
            onClick={openAddressQR}
            disabled={!!openingWidget || switching}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90 disabled:opacity-60"
          >
            <ArrowDownLeft className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Receive</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Get paid</div>
          </button>

          <button
            onClick={openOnRamp}
            disabled={!!openingWidget || switching || !onrampSupported}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90 disabled:opacity-60"
          >
            <Plus className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Deposit</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">
              {onrampSupported ? "Buy crypto" : "EVM only"}
            </div>
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="text-xs text-[var(--re-muted)]">Wallet address</div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              {displayAddress ? shortAddr(displayAddress) : "—"}
            </div>

            <button
              onClick={handleCopy}
              disabled={!displayAddress}
              className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90 disabled:opacity-60"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-3 text-xs text-[var(--re-muted)]">
            {network.id === "sol"
              ? "This is your embedded Solana wallet address."
              : "This is your embedded EVM wallet address."}
          </div>
        </div>

        {onrampTx ? (
          <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div className="text-sm font-semibold">Latest deposit activity</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white p-3">
                <div className="text-xs text-[var(--re-muted)]">Fiat amount</div>
                <div className="mt-1 font-semibold">
                  {onrampTx.fiatAmount ?? "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <div className="text-xs text-[var(--re-muted)]">
                  Expected crypto
                </div>
                <div className="mt-1 font-semibold">
                  {onrampTx.expectedCryptoAmount ?? onrampTx.cryptoAmount ?? "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <div className="text-xs text-[var(--re-muted)]">Actual crypto</div>
                <div className="mt-1 font-semibold">
                  {onrampTx.actualCryptoAmount ?? "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <div className="text-xs text-[var(--re-muted)]">Gas fee</div>
                <div className="mt-1 font-semibold">
                  {onrampTx.gasFee ?? "—"}
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-3">
                  <div className="text-xs text-[var(--re-muted)]">Order ID</div>
                  <div className="mt-1 font-semibold">
                    {onrampTx.orderId ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-3">
                  <div className="text-xs text-[var(--re-muted)]">Order status</div>
                  <div className="mt-1 font-semibold">
                    {getOnrampOrderStatusLabel(onrampTx.orderStatus)}
                  </div>
                </div>
              </div>

              {onrampTx.referenceId ? (
                <div className="rounded-2xl bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-[var(--re-muted)]">
                        Reference ID
                      </div>
                      <div className="mt-1 break-all font-semibold">
                        {onrampTx.referenceId}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        copyText(onrampTx.referenceId || "", "Reference ID copied.")
                      }
                      className="shrink-0 rounded-full border border-[var(--re-border)] p-2"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {onrampTx.transactionHash ? (
                <div className="rounded-2xl bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-[var(--re-muted)]">
                        Transaction hash
                      </div>
                      <div className="mt-1 break-all font-semibold">
                        {onrampTx.transactionHash}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        copyText(
                          onrampTx.transactionHash || "",
                          "Transaction hash copied."
                        )
                      }
                      className="shrink-0 rounded-full border border-[var(--re-border)] p-2"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-3">
                  <div className="text-xs text-[var(--re-muted)]">Wallet</div>
                  <div className="mt-1 break-all font-semibold">
                    {onrampTx.walletAddress ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-3">
                  <div className="text-xs text-[var(--re-muted)]">Updated</div>
                  <div className="mt-1 font-semibold">
                    {formatDate(onrampTx.updatedAt || onrampTx.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 text-center text-xs text-[var(--re-muted)]">
          <Link href="/" className="font-semibold text-[var(--re-primary)]">
            Back to Home
          </Link>
        </div>
      </div>

      {sendMenuOpen ? (
        <div className="fixed inset-0 z-40 bg-black/45 p-4">
          <div
            className="absolute inset-0"
            onClick={() => setSendMenuOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-[var(--re-border)] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Send money</div>
                <div className="text-sm text-[var(--re-muted)]">
                  Choose how you want to send
                </div>
              </div>
              <button
                onClick={() => setSendMenuOpen(false)}
                className="rounded-full border border-[var(--re-border)] p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SEND_RAILS.map((rail) => {
                const Icon = rail.icon;
                const isCrossChain = rail.id === "cross-chain";
                const disabled =
                  !rail.enabled || (isCrossChain && !crossChainSupportedSource);

                return (
                  <button
                    key={rail.id}
                    onClick={() => {
                      if (isCrossChain && !disabled) openCrossChainRail();
                    }}
                    disabled={disabled}
                    className="rounded-2xl border border-[var(--re-border)] bg-[var(--re-card)] p-4 text-left disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-2xl bg-white/80 p-2 ring-1 ring-black/5">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          rail.enabled &&
                          !(isCrossChain && !crossChainSupportedSource)
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {rail.enabled &&
                        !(isCrossChain && !crossChainSupportedSource)
                          ? "Live"
                          : "Soon"}
                      </span>
                    </div>

                    <div className="mt-3 text-sm font-semibold">{rail.title}</div>
                    <div className="mt-1 text-xs text-[var(--re-muted)]">
                      {isCrossChain && !crossChainSupportedSource
                        ? "Switch to a supported EVM network"
                        : rail.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {crossChainOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-4">
          <div
            className="absolute inset-0"
            onClick={() => setCrossChainOpen(false)}
          />
          <div className="relative mx-auto mt-8 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[var(--re-border)] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Crypto Cross Chain</div>
                <div className="text-sm text-[var(--re-muted)]">
                  Send USDC across supported chains
                </div>
              </div>
              <button
                onClick={() => setCrossChainOpen(false)}
                className="rounded-full border border-[var(--re-border)] p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--re-border)] bg-[var(--re-card)] p-4">
              <div className="text-xs text-[var(--re-muted)]">From</div>
              <div className="mt-1 text-sm font-semibold">{network.name}</div>
              <div className="mt-3 text-xs text-[var(--re-muted)]">To</div>
              <div className="relative mt-1">
                <select
                  value={crossDestination}
                  onChange={(e) => {
                    setCrossDestination(e.target.value as CrossChainDestination);
                    setCrossQuote(null);
                    setCrossIntent(null);
                  }}
                  className="w-full appearance-none rounded-xl border border-[var(--re-border)] bg-white px-3 py-3 pr-9 text-sm font-semibold"
                >
                  {DESTINATION_CHAINS.map((chain) => (
                    <option key={chain.value} value={chain.value}>
                      {chain.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--re-muted)]" />
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="text-xs text-[var(--re-muted)]">
                    Amount
                  </label>
                  <input
                    inputMode="decimal"
                    value={crossAmount}
                    onChange={(e) => {
                      setCrossAmount(e.target.value);
                      setCrossQuote(null);
                      setCrossIntent(null);
                    }}
                    placeholder="100"
                    className="mt-1 w-full rounded-xl border border-[var(--re-border)] bg-white px-3 py-3 text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--re-muted)]">
                    Token
                  </label>
                  <div className="mt-1 rounded-xl border border-[var(--re-border)] bg-slate-50 px-4 py-3 text-sm font-semibold">
                    USDC
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs text-[var(--re-muted)]">
                  Recipient address
                </label>
                <input
                  value={crossRecipient}
                  onChange={(e) => {
                    setCrossRecipient(e.target.value);
                    setCrossQuote(null);
                    setCrossIntent(null);
                  }}
                  placeholder="0x..."
                  className="mt-1 w-full rounded-xl border border-[var(--re-border)] bg-white px-3 py-3 text-sm outline-none"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={requestCrossChainQuote}
                  disabled={crossLoading}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: brandGradient }}
                >
                  {crossLoading ? "Loading…" : "Get quote"}
                </button>

                <button
                  onClick={() => {
                    setCrossAmount("");
                    setCrossRecipient(address || "");
                    resetCrossChainState();
                  }}
                  className="rounded-2xl border border-[var(--re-border)] bg-white px-4 py-3 text-sm font-semibold"
                >
                  Reset
                </button>
              </div>
            </div>

            {crossError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {crossError}
              </div>
            ) : null}

            {crossQuote ? (
              <div className="mt-4 rounded-2xl border border-[var(--re-border)] bg-[var(--re-card)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Best route found
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs text-[var(--re-muted)]">Bridge</div>
                    <div className="mt-1 font-semibold">
                      {crossQuote.bridge ?? "Direct"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs text-[var(--re-muted)]">
                      Estimated fee
                    </div>
                    <div className="mt-1 font-semibold">
                      {formatTokenText(crossQuote.totalFeesFormatted, "USDC")}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-white p-3 text-xs text-[var(--re-muted)]">
                  Supported bridges:{" "}
                  <span className="font-semibold text-[var(--re-text)]">
                    {crossQuote.supportedBridges?.join(", ") || "—"}
                  </span>
                </div>

                <button
                  onClick={createCrossChainIntent}
                  disabled={crossLoading}
                  className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: brandGradient }}
                >
                  {crossLoading ? "Creating…" : "Create funding intent"}
                </button>
              </div>
            ) : null}

            {crossIntent ? (
              <div className="mt-4 rounded-2xl border border-[var(--re-border)] bg-[var(--re-card)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Intent created</div>
                    <div className="mt-1 text-xs text-[var(--re-muted)]">
                      Fund this intent to start the cross-chain transfer
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                    {crossIntent.status}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs text-[var(--re-muted)]">
                      Fund exactly
                    </div>
                    <div className="mt-1 font-semibold">
                      {formatTokenText(
                        crossIntent.fundingAmountFormatted,
                        crossIntent.token
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-[var(--re-muted)]">
                          Intent address
                        </div>
                        <div className="mt-1 font-semibold break-all">
                          {crossIntent.intentAddress}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          copyText(
                            crossIntent.intentAddress,
                            "Intent address copied."
                          )
                        }
                        className="shrink-0 rounded-full border border-[var(--re-border)] p-2"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-xs text-[var(--re-muted)]">Route</div>
                      <div className="mt-1 font-semibold">
                        {crossIntent.sourceChain.replace("_MAINNET", "")} →{" "}
                        {crossIntent.destinationChain.replace("_MAINNET", "")}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-xs text-[var(--re-muted)]">
                        Estimated fee
                      </div>
                      <div className="mt-1 font-semibold">
                        {formatTokenText(
                          crossIntent.feesFormatted,
                          crossIntent.token
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--re-muted)]">
                      <Clock3 className="h-4 w-4" />
                      Expires
                    </div>
                    <div className="mt-1 font-semibold">
                      {formatDate(crossIntent.expiresAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={openWalletForFunding}
                    className="rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                    style={{ background: brandGradient }}
                  >
                    Open wallet send
                  </button>

                  <button
                    onClick={refreshCrossChainIntent}
                    disabled={crossLoading}
                    className="rounded-2xl border border-[var(--re-border)] bg-white px-4 py-3 text-sm font-semibold disabled:opacity-60"
                  >
                    Refresh status
                  </button>
                </div>

                <div className="mt-3 rounded-2xl border border-[var(--re-border)] bg-white/80 px-3 py-2 text-xs text-[var(--re-muted)]">
                  Wallet send opens your Magic transfer UI. The intent address is
                  already copied so you can fund it directly.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}