// src/app/api/chainrails/quote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  apiError,
  CHAINRAILS_DESTINATIONS,
  CHAINRAILS_SOURCE_BY_NETWORK,
  chainrailsFetch,
  getChainTokenBySymbol,
  type ChainrailsChain,
} from "@/lib/chainrails";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const sourceNetworkId = String(body?.sourceNetworkId ?? "");
    const destinationChain = String(body?.destinationChain ?? "") as ChainrailsChain;
    const amount = String(body?.amount ?? "").trim();
    const recipient = String(body?.recipient ?? "").trim();

    const sourceChain = CHAINRAILS_SOURCE_BY_NETWORK[sourceNetworkId];

    if (!sourceChain) {
      return apiError("This network is not supported for Chainrails yet.");
    }

    const isAllowedDestination = CHAINRAILS_DESTINATIONS.some(
      (c) => c.value === destinationChain
    );

    if (!isAllowedDestination) {
      return apiError("Unsupported destination chain.");
    }

    if (sourceChain === destinationChain) {
      return apiError("Choose a different destination chain.");
    }

    if (!amount || Number(amount) <= 0) {
      return apiError("Enter a valid amount.");
    }

    if (!ethers.isAddress(recipient)) {
      return apiError("Enter a valid recipient address.");
    }

    const sourceToken = await getChainTokenBySymbol(sourceChain, "USDC");
    const destinationToken = await getChainTokenBySymbol(destinationChain, "USDC");

    const amountRaw = ethers.parseUnits(amount, sourceToken.decimals).toString();

    const params = new URLSearchParams({
      tokenIn: sourceToken.address,
      tokenOut: destinationToken.address,
      sourceChain,
      destinationChain,
      amount: amountRaw,
      recipient,
      amountSymbol: "USDC",
    });

    const route = await chainrailsFetch<{
      sourceChain: string;
      destinationChain: string;
      tokenIn: string;
      tokenOut: string;
      originalAmount: string;
      totalFees: string;
      bridgeToUse: "ACROSS" | "CCTP" | "GATEWAY" | "RHINOFI" | null;
      bridgeAddress: string;
      bridgeExtraData: string;
      supportedBridges: string[];
      bridgeFeeDetails?: Record<string, unknown>;
    }>(`/router/optimal-route?${params.toString()}`);

    return NextResponse.json({
      ok: true,
      sourceChain,
      destinationChain,
      token: "USDC",
      sourceTokenAddress: sourceToken.address,
      destinationTokenAddress: destinationToken.address,
      decimals: sourceToken.decimals,
      amount,
      amountRaw,
      totalFeesRaw: route.totalFees,
      totalFeesFormatted: ethers.formatUnits(route.totalFees, sourceToken.decimals),
      bridge: route.bridgeToUse,
      supportedBridges: route.supportedBridges ?? [],
      bridgeAddress: route.bridgeAddress,
      bridgeExtraData: route.bridgeExtraData,
    });
  } catch (e: any) {
    return apiError(e?.message ?? "Failed to fetch quote.", 500);
  }
}