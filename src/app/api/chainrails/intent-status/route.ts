// src/app/api/chainrails/intent-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { apiError, chainrailsFetch } from "@/lib/chainrails";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = String(searchParams.get("address") ?? "").trim();

    if (!address) {
      return apiError("Missing intent address.");
    }

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
      recipient: string;
      refund_address: string;
      tx_hash: string | null;
      created_at: string;
      updated_at: string;
    }>(`/intents/address/${address}`);

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
    return apiError(e?.message ?? "Failed to refresh intent.", 500);
  }
}