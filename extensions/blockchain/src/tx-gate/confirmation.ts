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
      return `Transfer ${params.amount} native tokens to ${params.to} on ${params.network ?? "default network"}`;
    case "transfer_erc20":
      return `Transfer ${params.amount} of token ${params.tokenAddress} to ${params.to} on ${params.network ?? "default network"}`;
    case "approve_token_spending":
      return `Approve ${params.spender} to spend ${params.amount} of token ${params.tokenAddress}`;
    case "transfer_nft":
      return `Transfer NFT #${params.tokenId} from ${params.nftAddress} to ${params.to}`;
    case "transfer_erc1155":
      return `Transfer ${params.amount} of token #${params.tokenId} from ${params.tokenAddress} to ${params.to}`;
    case "write_contract":
      return `Call ${params.functionName}() on contract ${params.contractAddress}`;
    case "swap_execute":
      return `Swap ${params.amountIn} ${params.tokenIn === "native" ? "native token" : params.tokenIn} → ${params.tokenOut === "native" ? "native token" : params.tokenOut} on ${params.network ?? "bsc"}`;
    case "wallet_delete":
      return `Delete wallet "${params.label}"`;
    case "agent_register":
      return `Register agent identity on ${params.network ?? "bsc"} with URI: ${params.agentURI}`;
    case "agent_set_wallet":
      return `Set agent #${params.agentId ?? "stored"} wallet to ${params.walletAddress} on ${params.network ?? "bsc"}`;
    default:
      return `Execute ${toolName} with params: ${JSON.stringify(params)}`;
  }
}
