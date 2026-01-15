# Range - On-Chain Signature Verification

A Solana program demonstrating how to verify signed messages on-chain without requiring a second transaction signer.

This pattern enables backend-controlled data verification with tamper-proof guarantees.

## Problem

Traditional on-chain verification often requires multiple signers in a transaction, which means:

- The backend service needs to co-sign every transaction
- Increased complexity in transaction construction
- Potential security issue if the backend signs malicious transaction

## Solution

Instead of co-signing transactions, the backend signs a **message** containing the data to verify.

The on-chain program then:

1. Verifies the signature matches a pre-configured trusted public key
2. Extracts and validates the message contents
3. Ensures the data hasn't been tampered with

This approach provides the same security guarantees while decoupling the backend from real-time transaction signing.

## How It Works

### Message Format

```
{timestamp}_{pubkey}
```

- `timestamp`: Unix timestamp when the message was signed
- `pubkey`: The user's public key (must match the transaction signer)

### Complete Flow

```
+------------------+                     +------------------+                     +------------------+
|                  |                     |                  |                     |                  |
|      USER        |                     |     BACKEND      |                     |   RANGE.ORG API  |
|     (Client)     |                     |     (Server)     |                     |   (Compliance)   |
|                  |                     |                  |                     |                  |
+--------+---------+                     +--------+---------+                     +--------+---------+
         |                                        |                                        |
         |  1. Sign authentication message        |                                        |
         |     (proves wallet ownership)          |                                        |
         |--------------------------------------->|                                        |
         |                                        |                                        |
         |                                        |  2. Query user pubkey                  |
         |                                        |     for compliance check               |
         |                                        |--------------------------------------->|
         |                                        |                                        |
         |                                        |  3. Return: PASS or FAIL               |
         |                                        |<---------------------------------------|
         |                                        |                                        |
         |                                        |  4. If PASS: create & sign             |
         |                                        |     "{timestamp}_{pubkey}"             |
         |                                        |                                        |
         |  5. Return {signature, message}        |                                        |
         |<---------------------------------------|                                        |
         |                                        |                                        |
         |                                                                                 |
         |                                                                                 |
         v                                                                                 |
+--------+---------+                                                                       |
|                  |                                                                       |
|  SOLANA NETWORK  |                                                                       |
|                  |                                                                       |
+--------+---------+                                                                       |
         |                                                                                 |
         |  6. User submits transaction with:                                              |
         |     - signature (from backend)                                                  |
         |     - message (from backend)                                                    |
         |     - user signs the transaction                                                |
         |                                                                                 |
         v                                                                                 |
+-----------------------------------------------------------------------------------+     |
|                           ON-CHAIN PROGRAM (verify_range)                         |     |
|                                                                                   |     |
|  +-----------------------------------------------------------------------------+  |     |
|  |  7. VERIFICATION STEPS:                                                     |  |     |
|  |                                                                             |  |     |
|  |     a. Verify Ed25519 signature against stored range_signer pubkey         |  |     |
|  |        -> Ensures message came from trusted backend                         |  |     |
|  |                                                                             |  |     |
|  |     b. Parse message: extract timestamp and pubkey                          |  |     |
|  |        -> "{timestamp}_{pubkey}" format                                     |  |     |
|  |                                                                             |  |     |
|  |     c. Validate timestamp within allowed window_size                        |  |     |
|  |        -> Prevents replay attacks with old signatures                       |  |     |
|  |                                                                             |  |     |
|  |     d. Validate pubkey in message matches transaction signer                |  |     |
|  |        -> Ensures signature can't be used by different user                 |  |     |
|  |                                                                             |  |     |
|  |  8. If all checks pass -> Transaction succeeds                              |  |     |
|  |     If any check fails -> Transaction reverts with specific error           |  |     |
|  +-----------------------------------------------------------------------------+  |     |
+-----------------------------------------------------------------------------------+     |
```

### Step-by-Step Explanation

#### Step 1: User Authentication Request

The user signs an authentication message using their wallet (this is **message signing**, not a transaction).

This proves they own the private key for their public key without spending any SOL.

```typescript
// Client-side: User signs a message to prove wallet ownership
const authMessage = "Authenticate for Range verification";
const authSignature = await wallet.signMessage(Buffer.from(authMessage));

// Send to backend
await fetch("/api/verify", {
    method: "POST",
    body: JSON.stringify({
        pubkey: wallet.publicKey.toBase58(),
        signature: authSignature,
        message: authMessage,
    }),
});
```

#### Step 2-3: Backend Compliance Check

The backend verifies the authentication signature, then queries the Range.org API to check if this pubkey is allowed to
interact with the protocol (compliance, KYC, sanctions screening, etc.).

```typescript
// Backend-side
const isCompliant = await rangeOrgApi.checkPubkey(userPubkey);

if (!isCompliant) {
    return {error: "User not authorized"};
}
```

#### Step 4-5: Backend Creates Authorization

If the user passes compliance, the backend creates a time-bound authorization message and signs it with the
`range_signer` private key.

```typescript
// Backend-side
const timestamp = Math.floor(Date.now() / 1000);
const message = `${timestamp}_${userPubkey}`;
const signature = nacl.sign.detached(
    Buffer.from(message),
    rangeSignerKeypair.secretKey
);

return {signature, message};
```

#### Step 6: User Submits Transaction

The user includes the backend's signature and message in their on-chain transaction. The user signs the transaction with
their own wallet.

```typescript
// Client-side
const instruction = await buildVerifyRangeInstruction({
    signer: wallet.publicKey,
    signature: backendResponse.signature,
    message: Buffer.from(backendResponse.message),
});

const transaction = new Transaction().add(instruction);
await wallet.sendTransaction(transaction, connection);
```

#### Step 7-8: On-Chain Verification

The Solana program verifies everything:

| Check                  | What it Validates                         | Attack it Prevents    |
|------------------------|-------------------------------------------|-----------------------|
| Signature verification | Message was signed by trusted backend     | Forged authorizations |
| Timestamp validation   | Signature is recent (within window_size)  | Replay attacks        |
| Pubkey validation      | Message pubkey matches transaction signer | Signature theft       |

### Simple Verification Flow

```
+-----------+     1. Request signed message     +-----------+
|  Client   | --------------------------------> |  Backend  |
|           |                                   |           |
|           | <-------------------------------- |           |
+-----------+     2. Return {sig, message}      +-----------+
      |
      | 3. Submit transaction with sig + message
      v
+---------------------------------------------------------------+
|                      Solana Program                           |
|                                                               |
|  +----------------------------------------------------------+ |
|  | 1. Verify signature against stored range_signer pubkey   | |
|  | 2. Parse message: extract timestamp and pubkey           | |
|  | 3. Validate timestamp within allowed window              | |
|  | 4. Validate pubkey matches transaction signer            | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

### Security Properties

- **Authenticity**: Only the backend (holding `range_signer` private key) can create valid signatures
- **Integrity**: Any modification to the message invalidates the signature
- **Freshness**: Time window validation prevents replay attacks
- **Binding**: Pubkey in message must match the transaction signer

## Program Structure

### Accounts

**Settings** - Singleton PDA storing configuration:

- `bump`: PDA bump seed
- `window_size`: Allowed time window (in seconds) for timestamp validation
- `range_signer`: Public key of the trusted backend signer

### Instructions

**initialize_settings**

- Creates the Settings account
- Sets the trusted `range_signer` public key
- Configures the time `window_size`

**verify_range**

- Accepts `signature` and `message` as arguments
- Verifies Ed25519 signature against `range_signer`
- Validates timestamp within `window_size` of current time
- Ensures message pubkey matches transaction signer

## Extending the Pattern

The message can include additional data beyond timestamp and pubkey:

```
{timestamp}_{pubkey}_{amount}_{action}_{custom_data}
```

Examples:

- **Amount limits**: `1704067200_ABC123_1000` - verify user can transfer up to 1000 tokens
- **Action authorization**: `1704067200_ABC123_withdraw_vault1` - authorize specific action
- **KYC verification**: `1704067200_ABC123_kyc_verified` - prove user passed KYC
- **Rate limiting**: Backend tracks requests and only signs within rate limits

## PDA Extension

Another potential extension is by creating a PDA in the instruction.

That also stores `pubkey`, `timestamp` and other params.

This pattern enable more strict replay attack protection.

And potentially a cache to avoid rechecking the same `pubkey` each request.

If this pattern isn't used, we suggest to cache in the backend `range` responses.

Since `range` data doesn't change with very high frequency, this helps performance and reduce API usage.

## Usage

### Build

```bash
anchor build
```

### Test

```bash
anchor test
```

### Initialize Settings

```typescript
import {buildInitializeSettingsInstruction} from "./codama-ts-dca-custom";

const instruction = await buildInitializeSettingsInstruction({
    signer: walletPublicKey,
    rangeSigner: backendPublicKey,
    windowSize: 60n, // 60 seconds
});
```

### Verify a Signed Message

```typescript
import {buildVerifyRangeInstruction} from "./codama-ts-dca-custom";

// Backend signs: `${timestamp}_${userPubkey}`
const message = Buffer.from(`${timestamp}_${userPubkey.toBase58()}`);
const signature = nacl.sign.detached(message, backendKeypair.secretKey);

const instruction = await buildVerifyRangeInstruction({
    signer: userPublicKey,
    signature: new Uint8Array(signature),
    message: new Uint8Array(message),
});
```

## Project Structure

```
range/
├── programs/range/src/
│   ├── instructions/
│   │   ├── initialize_settings.rs
│   │   └── verify_range.rs
│   ├── state/
│   │   └── settings.rs
│   ├── error.rs
│   └── lib.rs
├── codama-ts-dca/           # Generated TypeScript client
├── codama-ts-dca-custom/    # Custom wrappers and helpers
│   ├── constants/
│   ├── pda/
│   ├── utils/
│   └── wrappers/
└── tests/
    └── range.ts
```

## Error Codes

| Error                     | Description                                          |
|---------------------------|------------------------------------------------------|
| `TimestampParsingFailed`  | Message timestamp could not be parsed                |
| `PubkeyParsingFailed`     | Message pubkey could not be parsed                   |
| `WrongMessageSplitLength` | Message format invalid (expected `timestamp_pubkey`) |
| `WrongSigner`             | Message pubkey doesn't match transaction signer      |
| `TimestampOutOfWindow`    | Timestamp outside allowed time window                |
| `CouldntVerifySignature`  | Ed25519 signature verification failed                |
