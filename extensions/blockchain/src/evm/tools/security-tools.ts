import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import { DEFAULT_CHAIN_ID, resolveChainId } from "../chains.js";
import { checkAddressSecurity } from "../services/security.js";

export function registerSecurityTools(api: OpenClawPluginApi) {
  api.registerTool({
    name: "check_address_security",
    description:
      "Check if a blockchain address is flagged for phishing, scams, or malicious activity via GoPlus Security API. Use before sending funds to an unknown address.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "The blockchain address to check" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["address"],
    },
    async execute(_toolCallId: string, params: { address: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const result = await checkAddressSecurity(params.address, chainId);

      const lines: string[] = [];
      if (result.riskLevel === "none") {
        lines.push(`Address ${params.address}: No security risks detected.`);
      } else {
        lines.push(`Address ${params.address}: ${result.riskLevel.toUpperCase()} RISK`);
        lines.push(`Flags: ${result.flags.join(", ")}`);
        if (result.riskLevel === "critical" || result.riskLevel === "high") {
          lines.push("Recommendation: Do NOT send funds to this address.");
        } else {
          lines.push("Recommendation: Proceed with caution.");
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  });
}
