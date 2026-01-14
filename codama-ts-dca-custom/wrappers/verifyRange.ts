import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { address } from "@solana/kit";
import { getVerifyRangeInstructionAsync } from "../../codama-ts-dca/instructions";
import { getSettingsAddress } from "../pda";
import { toTransactionSigner, toTransactionInstruction } from "../utils";

export type BuildVerifyRangeInstruction = {
  signer: PublicKey;
  signature: Uint8Array;
  message: Uint8Array;
};

export async function buildVerifyRangeInstruction(
  input: BuildVerifyRangeInstruction
): Promise<TransactionInstruction> {
  const { signer, signature, message } = input;
  const [settingsPda] = getSettingsAddress();

  const instruction = await getVerifyRangeInstructionAsync({
    signer: toTransactionSigner(signer),
    settings: address(settingsPda.toBase58()),
    signature,
    message,
  });

  return toTransactionInstruction(instruction);
}
