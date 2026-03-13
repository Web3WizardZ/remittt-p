// src/app/api/chainrails/intent/route.ts
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
    const sender = String(body?.sender ?? "").trim();
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

    if (!ethers.isAddress(sender)) {
      return apiError("Invalid sender address.");
    }

    if (!ethers.isAddress(recipient)) {
      return apiError("Invalid recipient address.");
    }

    const sourceToken = await getChainTokenBySymbol(sourceChain, "USDC");

    const amountRaw = ethers.parseUnits(amount, sourceToken.decimals).toString();

    const intent = await chainrailsFetch<{
      id: number;
      intent_address: string;
      destination_intent_address?: string;
      source_chain: string;
      destination_chain: string;
      asset_token_symbol: string;
      asset_token_decimals: number;
      total_amount_in_asset_token: string;
      fees_in_asset_token: string;
      intent_status: string;
      expires_at: string;
      created_at: string;
      updated_at: string;
      recipient: string;
      refund_address: string;
      tx_hash: string | null;
      metadata?: Record<string, unknown>;
    }>("/intents", {
      method: "POST",
      body: JSON.stringify({
        sender,
        amount: amountRaw,
        amountSymbol: "USDC",
        tokenIn: sourceToken.address,
        source_chain: sourceChain,
        destination_chain: destinationChain,
        recipient,
        refund_address: sender,
        metadata: {
          app: "RemittEase",
          rail: "crypto-cross-chain",
          token: "USDC",
        },
      }),
    });

    return NextResponse.json({
      ok: true,
      id: intent.id,
      intentAddress: intent.intent_address,
      destinationIntentAddress: intent.destination_intent_address ?? "",
      sourceChain: intent.source_chain,
      destinationChain: intent.destination_chain,
      token: intent.asset_token_symbol,
      tokenDecimals: intent.asset_token_decimals,
      fundingAmountRaw: intent.total_amount_in_asset_token,
      fundingAmountFormatted: ethers.formatUnits(
        intent.total_amount_in_asset_token,
        intent.asset_token_decimals
      ),
      feesRaw: intent.fees_in_asset_token,
      feesFormatted: ethers.formatUnits(
        intent.fees_in_asset_token,
        intent.asset_token_decimals
      ),
      status: intent.intent_status,
      recipient: intent.recipient,
      refundAddress: intent.refund_address,
      expiresAt: intent.expires_at,
      txHash: intent.tx_hash,
      createdAt: intent.created_at,
      updatedAt: intent.updated_at,
    });
  } catch (e: any) {
    return apiError(e?.message ?? "Failed to create intent.", 500);
  }
}