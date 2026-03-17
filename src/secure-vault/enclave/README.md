# TEE Enclave Server

SecureVault enclave service — holds API keys and wallet secrets in isolated memory, signs requests, enforces policies. Same code runs locally for development or inside a real TEE for production.

## Quick Start (Development)

```bash
# Start the enclave server
ENCLAVE_PORT=3443 bun src/secure-vault/enclave/server.ts

# In another terminal, start the gateway pointing to the enclave
CRYPTOCLAW_TEE_ENDPOINT=http://localhost:3443 cryptoclaw gateway run
```

The gateway auto-detects the enclave on startup. All `signed_api_request` tool calls will route through it.

## Store Credentials

Once running, store exchange credentials via the `vault_store_credential` tool or send an RPC directly:

```bash
curl -X POST http://localhost:3443/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "store_credential",
    "params": {
      "provider": "binance",
      "credentials": {
        "apiKey": "your-api-key",
        "apiSecret": "your-api-secret",
        "testnet": "true"
      }
    }
  }'
```

## Health Check

```bash
curl -s http://localhost:3443/rpc \
  -H "Content-Type: application/json" \
  -d '{"method":"health","params":{}}' | jq
```

## RPC Methods

| Method              | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `health`            | Check enclave status                                 |
| `store_credential`  | Store API key + secret for a provider                |
| `delete_credential` | Remove credentials for a provider                    |
| `signed_request`    | Sign and send an authenticated API request           |
| `get_attestation`   | Get TEE attestation report (placeholder in dev mode) |
| `list_providers`    | List providers with stored credentials               |

## Policy Engine

The enclave enforces security policies before signing any request:

- **Path allowlist** — Only pre-approved API endpoints are allowed (order, account, market data)
- **Rate limiting** — Max 30 order-related requests per minute per provider
- Extend `DEFAULT_POLICY` in `server.ts` to add custom rules (amount limits, symbol allowlists, etc.)

## Deployment: Dev → Production

The same `server.ts` code works across all environments. What changes is **how you start it**:

| Deployment              | Command                                  | Hardware Isolation                    | Attestation                |
| ----------------------- | ---------------------------------------- | ------------------------------------- | -------------------------- |
| **Local (dev)**         | `bun server.ts`                          | None — same as any Node process       | Placeholder                |
| **Gramine + Intel SGX** | `gramine-sgx bun server.ts`              | SGX enclave (encrypted memory)        | Real MRENCLAVE from CPU    |
| **AWS Nitro Enclave**   | Package as EIF → `nitro-cli run-enclave` | Nitro isolation (no network, no disk) | Real PCR measurements      |
| **Phala dStack**        | `dstack deploy` (Docker → TEE)           | Confidential VM                       | Real attestation via Phala |
| **Marlin Oyster CVM**   | `oyster deploy` (Nix reproducible build) | TEE CVM with persistent keys          | Real attestation + RA-TLS  |

### What changes per platform

Only the `get_attestation` RPC handler needs platform-specific code:

```
Local:        returns placeholder
SGX:          calls sgx_create_report() → Quoting Enclave → QUOTE
Nitro:        reads /dev/nsm (Nitro Secure Module)
Phala/Marlin: calls platform attestation SDK
```

Everything else — credential storage, signing, policy enforcement, HTTP dispatch — is identical.

## Environment Variables

| Variable       | Required | Description                                                                  |
| -------------- | -------- | ---------------------------------------------------------------------------- |
| `ENCLAVE_PORT` | No       | Server port (default: `3443`)                                                |
| `TEE_PLATFORM` | No       | Platform identifier for attestation (`sgx`, `nitro`, `phala`, `development`) |

### Gateway-side variables (set where CryptoClaw runs, not in the enclave)

| Variable                   | Required | Description                                                            |
| -------------------------- | -------- | ---------------------------------------------------------------------- |
| `CRYPTOCLAW_TEE_ENDPOINT`  | No       | Enclave URL (e.g. `http://localhost:3443`). If unset, TEE is not used. |
| `CRYPTOCLAW_TEE_TRANSPORT` | No       | Connection type: `grpc`, `vsock`, or `unix` (default: `grpc`)          |
| `CRYPTOCLAW_TEE_MRENCLAVE` | No       | Expected code hash. If set, attestation is verified on connect.        |

## Architecture

```
CryptoClaw Gateway (Node.js)
  │
  │  signed_api_request("binance", "POST", "/api/v3/order", params)
  │
  │  Only sends: provider + method + path + params
  │  Never sends: API keys or secrets
  │
  ▼  HTTP POST /rpc
┌──────────────────────────────────────────────┐
│  Enclave Server (this process)               │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Credential Store (in-memory)           │  │
│  │  binance → { apiKey, apiSecret }       │  │
│  │  okx     → { apiKey, apiSecret }       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Policy Engine                          │  │
│  │  ✓ Path allowlist                      │  │
│  │  ✓ Rate limiting (30 orders/min)       │  │
│  │  ✓ Extensible (add amount limits etc.) │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Signing + HTTP Dispatch                │  │
│  │  1. Read credentials from store        │  │
│  │  2. Add timestamp + recvWindow         │  │
│  │  3. HMAC-SHA256 sign                   │  │
│  │  4. Send HTTPS to exchange             │  │
│  │  5. Return response (no secrets)       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  In TEE: all of the above runs in hardware-  │
│  encrypted memory. Root cannot read secrets. │
└──────────────────────────────────────────────┘
```
