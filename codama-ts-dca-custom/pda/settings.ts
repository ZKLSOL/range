import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { RANGE_PROGRAM_ADDRESS } from "../../codama-ts-dca/programs";
import { SETTINGS_SEED } from "../constants";

export function getSettingsAddress(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(anchor.utils.bytes.utf8.encode(SETTINGS_SEED))],
    new PublicKey(RANGE_PROGRAM_ADDRESS)
  );
}
