import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { address } from "@solana/kit";
import { getInitializeSettingsInstructionAsync } from "../../codama-ts-dca/instructions";
import { getSettingsAddress } from "../pda";
import { toTransactionSigner, toTransactionInstruction } from "../utils";

export type BuildInitializeSettingsInstruction = {
  signer: PublicKey;
  rangeSigner: PublicKey;
  windowSize: number | bigint;
};

export async function buildInitializeSettingsInstruction(
  input: BuildInitializeSettingsInstruction
): Promise<TransactionInstruction> {
  const { signer, rangeSigner, windowSize } = input;
  const [settingsPda] = getSettingsAddress();

  const instruction = await getInitializeSettingsInstructionAsync({
    signer: toTransactionSigner(signer),
    settings: address(settingsPda.toBase58()),
    rangeSigner: address(rangeSigner.toBase58()),
    windowSize,
  });

  return toTransactionInstruction(instruction);
}
