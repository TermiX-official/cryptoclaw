/**
 * ERC-8004 Agent Identity — core service functions.
 *
 * Provides on-chain agent registration, identity queries, wallet assignment,
 * and reputation lookups via the Trustless Agents standard.
 */

import { type Address, type Hash, decodeEventLog, formatUnits, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ERC8004_IDENTITY_REGISTRY_ABI } from "./abi/erc8004-identity.js";
import { ERC8004_REPUTATION_REGISTRY_ABI } from "./abi/erc8004-reputation.js";
import {
  getIdentityRegistryAddress,
  getReputationRegistryAddress,
} from "./agent-identity-config.js";
import { getPublicClient, getWalletClient } from "./clients.js";

// --- Types ---

export type AgentRegistration = {
  agentId: bigint;
  txHash: Hash;
  chainId: number;
  registryAddress: string;
};

export type AgentIdentity = {
  agentId: bigint;
  owner: string;
  uri: string;
  wallet: string;
  chainId: number;
};

export type AgentReputation = {
  count: bigint;
  averageScore: string;
  chainId: number;
};

// --- Registration ---

/**
 * Register a new agent on the ERC-8004 Identity Registry.
 * Mints an ERC-721 NFT representing the agent's on-chain identity.
 */
export async function registerAgent(
  privateKey: `0x${string}`,
  agentURI: string,
  chainId: number,
): Promise<AgentRegistration> {
  const registryAddress = getIdentityRegistryAddress(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: ERC8004_IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [agentURI],
  });

  // Wait for receipt and extract minted tokenId from Transfer event
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  let agentId: bigint | undefined;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: ERC8004_IDENTITY_REGISTRY_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "Transfer") {
        agentId = (decoded.args as { tokenId: bigint }).tokenId;
        break;
      }
    } catch {
      // Not a matching event — skip
    }
  }

  if (agentId === undefined) {
    throw new Error("Registration transaction succeeded but no Transfer event found in receipt");
  }

  return {
    agentId,
    txHash,
    chainId,
    registryAddress,
  };
}

// --- Identity queries ---

/** Query an agent's on-chain identity by ID. */
export async function getAgentIdentity(agentId: bigint, chainId: number): Promise<AgentIdentity> {
  const registryAddress = getIdentityRegistryAddress(chainId);
  const client = getPublicClient(chainId);

  const [owner, uri, wallet] = await Promise.all([
    client.readContract({
      address: registryAddress,
      abi: ERC8004_IDENTITY_REGISTRY_ABI,
      functionName: "ownerOf",
      args: [agentId],
    }) as Promise<Address>,
    client.readContract({
      address: registryAddress,
      abi: ERC8004_IDENTITY_REGISTRY_ABI,
      functionName: "tokenURI",
      args: [agentId],
    }) as Promise<string>,
    client.readContract({
      address: registryAddress,
      abi: ERC8004_IDENTITY_REGISTRY_ABI,
      functionName: "getAgentWallet",
      args: [agentId],
    }) as Promise<Address>,
  ]);

  return {
    agentId,
    owner,
    uri,
    wallet,
    chainId,
  };
}

// --- Agent wallet ---

/**
 * Set the agent's designated wallet via EIP-712 signed message.
 *
 * The `ownerPrivateKey` is used to send the transaction (must own the agent NFT).
 * The `newWalletPrivateKey` signs the EIP-712 message to prove consent of the new wallet.
 * If both are the same key, the owner is setting themselves as the agent wallet.
 */
export async function setAgentWallet(
  ownerPrivateKey: `0x${string}`,
  agentId: bigint,
  newWalletPrivateKey: `0x${string}`,
  chainId: number,
): Promise<Hash> {
  const registryAddress = getIdentityRegistryAddress(chainId);
  const walletClient = getWalletClient(chainId, ownerPrivateKey);
  const ownerAccount = privateKeyToAccount(ownerPrivateKey);
  const newWalletAccount = privateKeyToAccount(newWalletPrivateKey);

  // Deadline: 1 hour from now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  // The EIP-712 signature must come from the NEW wallet to prove consent.
  // Struct: AgentWalletSet(uint256 agentId, address newWallet, address owner, uint256 deadline)
  const signature = await newWalletAccount.signTypedData({
    domain: {
      name: "ERC8004IdentityRegistry",
      version: "1",
      chainId: BigInt(chainId),
      verifyingContract: registryAddress,
    },
    types: {
      AgentWalletSet: [
        { name: "agentId", type: "uint256" },
        { name: "newWallet", type: "address" },
        { name: "owner", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "AgentWalletSet",
    message: {
      agentId,
      newWallet: newWalletAccount.address,
      owner: ownerAccount.address,
      deadline,
    },
  });

  return walletClient.writeContract({
    address: registryAddress,
    abi: ERC8004_IDENTITY_REGISTRY_ABI,
    functionName: "setAgentWallet",
    args: [agentId, newWalletAccount.address, deadline, signature],
  });
}

// --- Reputation ---

/** Query an agent's reputation summary. */
export async function getAgentReputation(
  agentId: bigint,
  chainId: number,
): Promise<AgentReputation> {
  const reputationAddress = getReputationRegistryAddress(chainId);
  const client = getPublicClient(chainId);

  const [count, averageValue, averageDecimals] = (await client.readContract({
    address: reputationAddress,
    abi: ERC8004_REPUTATION_REGISTRY_ABI,
    functionName: "getSummary",
    args: [agentId, [], "", ""],
  })) as [bigint, bigint, number];

  const averageScore = count > 0n ? formatUnits(averageValue, averageDecimals) : "0";

  return {
    count,
    averageScore,
    chainId,
  };
}

// --- Listing ---

/**
 * List all agent IDs owned by an address on a given chain.
 *
 * The Identity Registry is not ERC-721 Enumerable, so we scan Transfer events
 * (mint = from zero address) and filter out any subsequently transferred away.
 */
export async function listRegisteredAgents(
  ownerAddress: `0x${string}`,
  chainId: number,
): Promise<bigint[]> {
  const registryAddress = getIdentityRegistryAddress(chainId);
  const client = getPublicClient(chainId);

  // Get all Transfer events where tokens were minted to or transferred to this owner
  const receivedLogs = await client.getContractEvents({
    address: registryAddress,
    abi: ERC8004_IDENTITY_REGISTRY_ABI,
    eventName: "Transfer",
    args: { to: ownerAddress },
    fromBlock: 0n,
  });

  // Get all Transfer events where this owner sent tokens away
  const sentLogs = await client.getContractEvents({
    address: registryAddress,
    abi: ERC8004_IDENTITY_REGISTRY_ABI,
    eventName: "Transfer",
    args: { from: ownerAddress },
    fromBlock: 0n,
  });

  const sentTokenIds = new Set(sentLogs.map((log) => (log.args as { tokenId: bigint }).tokenId));

  // Tokens received but not sent away are still owned
  const ownedIds: bigint[] = [];
  const seen = new Set<bigint>();
  for (const log of receivedLogs) {
    const tokenId = (log.args as { tokenId: bigint }).tokenId;
    if (!sentTokenIds.has(tokenId) && !seen.has(tokenId)) {
      seen.add(tokenId);
      ownedIds.push(tokenId);
    }
  }

  return ownedIds;
}
