import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import type { WalletManager } from "../../wallet/wallet-manager.js";
import { resolveActivePrivateKey } from "../../wallet/active-wallet.js";
import { DEFAULT_CHAIN_ID, resolveChainId, getChain } from "../chains.js";
import { isErc8004Supported } from "../services/agent-identity-config.js";
import { readAgentIdentity, writeAgentIdentity } from "../services/agent-identity-store.js";
import {
  registerAgent,
  getAgentIdentity,
  setAgentWallet,
  getAgentReputation,
  listRegisteredAgents,
} from "../services/agent-identity.js";

export function registerIdentityTools(api: OpenClawPluginApi, walletManager: WalletManager) {
  const stateDir = api.runtime.stateDir;

  // --- Register Agent ---
  api.registerTool({
    name: "agent_register",
    description:
      "Register this agent on-chain using ERC-8004 (Trustless Agents). " +
      "Mints an ERC-721 NFT representing the agent's identity. " +
      "Requires an active wallet with funds for gas.",
    parameters: {
      type: "object",
      properties: {
        agentURI: {
          type: "string",
          description:
            'URI pointing to the agent metadata (e.g. "https://example.com/agent.json" or IPFS URI)',
        },
        network: {
          type: "string",
          description: 'Network to register on (default: "bsc"). Must support ERC-8004.',
        },
      },
      required: ["agentURI"],
    },
    async execute(params: { agentURI: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;

      if (!isErc8004Supported(chainId)) {
        throw new Error(`ERC-8004 is not deployed on chain ${chainId}. Use a supported network.`);
      }

      const privateKey = await resolveActivePrivateKey(walletManager);
      const result = await registerAgent(privateKey, params.agentURI, chainId);

      // Persist locally
      writeAgentIdentity(stateDir, {
        agentId: Number(result.agentId),
        chainId: result.chainId,
        registryAddress: result.registryAddress,
        agentWallet: walletManager.getActiveAddress() ?? "",
        agentURI: params.agentURI,
        registeredAt: new Date().toISOString(),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "registered",
                agentId: result.agentId.toString(),
                txHash: result.txHash,
                network: getChain(chainId).name,
                registryAddress: result.registryAddress,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Query Agent Identity ---
  api.registerTool({
    name: "agent_identity",
    description:
      "Query an agent's on-chain identity (owner, URI, wallet) by agent ID. " +
      "If no agent ID is provided, uses the locally stored identity.",
    parameters: {
      type: "object",
      properties: {
        agentId: {
          type: "string",
          description: "Agent ID (token ID). Omit to use this agent's stored ID.",
        },
        network: {
          type: "string",
          description: 'Network to query (default: "bsc")',
        },
      },
    },
    async execute(params: { agentId?: string; network?: string }) {
      let chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;

      let agentIdBigint: bigint;
      if (params.agentId) {
        agentIdBigint = BigInt(params.agentId);
      } else {
        const stored = readAgentIdentity(stateDir);
        if (!stored) {
          throw new Error(
            "No agent ID provided and no locally registered identity found. " +
              "Register first with agent_register.",
          );
        }
        agentIdBigint = BigInt(stored.agentId);
        chainId = stored.chainId;
      }

      const identity = await getAgentIdentity(agentIdBigint, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                agentId: identity.agentId.toString(),
                owner: identity.owner,
                uri: identity.uri,
                wallet: identity.wallet,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Set Agent Wallet ---
  api.registerTool({
    name: "agent_set_wallet",
    description:
      "Set the active wallet as the designated agent wallet (EIP-712 signed). " +
      "The active wallet must own the agent NFT. The active wallet signs an EIP-712 " +
      "consent proof and is set as the agent's on-chain wallet.",
    parameters: {
      type: "object",
      properties: {
        agentId: {
          type: "string",
          description: "Agent ID. Omit to use this agent's stored ID.",
        },
        network: {
          type: "string",
          description: 'Network (default: "bsc")',
        },
      },
    },
    async execute(params: { agentId?: string; network?: string }) {
      let chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;

      let agentIdBigint: bigint;
      if (params.agentId) {
        agentIdBigint = BigInt(params.agentId);
      } else {
        const stored = readAgentIdentity(stateDir);
        if (!stored) {
          throw new Error("No agent ID provided and no locally registered identity found.");
        }
        agentIdBigint = BigInt(stored.agentId);
        chainId = stored.chainId;
      }

      const privateKey = await resolveActivePrivateKey(walletManager);
      const activeAddress = walletManager.getActiveAddress();
      // Active wallet is both the owner (sender) and the new wallet (signer).
      const txHash = await setAgentWallet(privateKey, agentIdBigint, privateKey, chainId);

      // Update local store
      const stored = readAgentIdentity(stateDir);
      if (stored && BigInt(stored.agentId) === agentIdBigint) {
        stored.agentWallet = activeAddress ?? "";
        writeAgentIdentity(stateDir, stored);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "wallet_updated",
                agentId: agentIdBigint.toString(),
                newWallet: activeAddress,
                txHash,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Query Reputation ---
  api.registerTool({
    name: "agent_reputation",
    description: "Query an agent's reputation summary from the ERC-8004 Reputation Registry.",
    parameters: {
      type: "object",
      properties: {
        agentId: {
          type: "string",
          description: "Agent ID. Omit to use this agent's stored ID.",
        },
        network: {
          type: "string",
          description: 'Network to query (default: "bsc")',
        },
      },
    },
    async execute(params: { agentId?: string; network?: string }) {
      let chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;

      let agentIdBigint: bigint;
      if (params.agentId) {
        agentIdBigint = BigInt(params.agentId);
      } else {
        const stored = readAgentIdentity(stateDir);
        if (!stored) {
          throw new Error("No agent ID provided and no locally registered identity found.");
        }
        agentIdBigint = BigInt(stored.agentId);
        chainId = stored.chainId;
      }

      const rep = await getAgentReputation(agentIdBigint, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                agentId: agentIdBigint.toString(),
                feedbackCount: rep.count.toString(),
                averageScore: rep.averageScore,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- List Registered Agents ---
  api.registerTool({
    name: "agent_list_registered",
    description: "List all ERC-8004 agent identities owned by the active wallet.",
    parameters: {
      type: "object",
      properties: {
        network: {
          type: "string",
          description: 'Network to query (default: "bsc")',
        },
      },
    },
    async execute(params: { network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;

      const address = walletManager.getActiveAddress();
      if (!address) {
        throw new Error("No active wallet");
      }

      const ids = await listRegisteredAgents(address as `0x${string}`, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                owner: address,
                agentIds: ids.map((id) => id.toString()),
                count: ids.length,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });
}
