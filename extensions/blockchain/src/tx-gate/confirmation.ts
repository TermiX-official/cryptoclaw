/** Tool names that require transaction confirmation before execution. */
export const STATE_CHANGING_TOOLS = new Set([
  "transfer_native_token",
  "transfer_erc20",
  "approve_token_spending",
  "transfer_nft",
  "transfer_erc1155",
  "write_contract",
  "swap_execute",
  "wallet_delete",
  "agent_register",
  "agent_set_wallet",
  // wallet_export is CLI-only — not an agent tool, no confirmation needed here
]);

/**
 * Check if a tool call requires user confirmation.
 * Used in the before_tool_call hook to gate state-changing operations.
 */
export function requiresConfirmation(toolName: string): boolean {
  return STATE_CHANGING_TOOLS.has(toolName);
}

/**
 * Format a human-readable transaction summary for confirmation.
 */
export function formatConfirmationPrompt(
  toolName: string,
  params: Record<string, unknown>,
): string {
  switch (toolName) {
    case "transfer_native_token":
      return `Transfer ${String(params.amount)} native tokens to ${String(params.to)} on ${String(params.network) || "default network"}`;
    case "transfer_erc20":
      return `Transfer ${String(params.amount)} of token ${String(params.tokenAddress)} to ${String(params.to)} on ${String(params.network) || "default network"}`;
    case "approve_token_spending":
      return `Approve ${String(params.spender)} to spend ${String(params.amount)} of token ${String(params.tokenAddress)}`;
    case "transfer_nft":
      return `Transfer NFT #${String(params.tokenId)} from ${String(params.nftAddress)} to ${String(params.to)}`;
    case "transfer_erc1155":
      return `Transfer ${String(params.amount)} of token #${String(params.tokenId)} from ${String(params.tokenAddress)} to ${String(params.to)}`;
    case "write_contract":
      return `Call ${String(params.functionName)}() on contract ${String(params.contractAddress)}`;
    case "swap_execute":
      return `Swap ${String(params.amountIn)} ${params.tokenIn === "native" ? "native token" : String(params.tokenIn)} → ${params.tokenOut === "native" ? "native token" : String(params.tokenOut)} on ${String(params.network) || "bsc"}`;
    case "wallet_delete":
      return `Delete wallet "${String(params.label)}"`;
    case "agent_register":
      return `Register agent identity on ${String(params.network) || "bsc"} with URI: ${String(params.agentURI)}`;
    case "agent_set_wallet":
      return `Set agent #${String(params.agentId) || "stored"} wallet to ${String(params.walletAddress)} on ${String(params.network) || "bsc"}`;
    default:
      return `Execute ${toolName} with params: ${JSON.stringify(params)}`;
  }
}
