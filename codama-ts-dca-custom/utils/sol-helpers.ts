import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  type AccountMeta,
} from "@solana/web3.js";
import { address, type Address, type TransactionSigner } from "@solana/kit";

export type TxnResult = {
  signature: string;
  result: string;
};

export function toTransactionSigner(publicKey: PublicKey): TransactionSigner {
  return {
    address: address(publicKey.toBase58()),
    signTransactions: async (txs) => txs,
  } as TransactionSigner;
}

export function toAccountMeta(
  publicKey: PublicKey,
  isWritable: boolean = false,
  isSigner: boolean = false
): AccountMeta {
  return {
    pubkey: publicKey,
    isWritable,
    isSigner,
  };
}

export function toTransactionInstruction(instruction: {
  programAddress: Address;
  accounts: readonly { address: Address; role: number; signer?: unknown }[];
  data: Uint8Array;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programAddress),
    keys: instruction.accounts.map((acc) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: acc.role >= 2,
      isWritable: acc.role === 1 || acc.role === 3,
    })),
    data: Buffer.from(instruction.data),
  });
}

export async function accountExists(
  connection: Connection,
  address: PublicKey
): Promise<boolean> {
  const account = await connection.getAccountInfo(address);
  return account !== null;
}

export function addPriorityFee(): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 10_000,
  });
}

export function modifyComputeUnits(): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitLimit({
    units: 300_000,
  });
}

export async function processTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: Keypair
): Promise<TxnResult> {
  const blockhash = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: [addPriorityFee(), modifyComputeUnits(), ...instructions],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([payer]);

  const signature = await connection.sendTransaction(transaction, {
    skipPreflight: false,
  });

  const result = await connection.confirmTransaction({
    signature,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  });

  return {
    signature,
    result: result.value.err ? JSON.stringify(result.value.err) : "success",
  };
}

export async function processAndValidateTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: Keypair
): Promise<TxnResult> {
  const result = await processTransaction(connection, instructions, payer);
  if (result.result !== "success") {
    throw new Error(`Transaction failed: ${result.result}`);
  }
  return result;
}
