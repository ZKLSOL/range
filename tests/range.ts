import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Range } from "../target/types/range";
import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import nacl from "tweetnacl";

describe("range", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.range as Program<Range>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  const rangeSignerKeypair = Keypair.generate();
  const windowSize = new anchor.BN(60);

  const getSettingsPda = (): PublicKey => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("Settings")],
      program.programId
    );
    return pda;
  };

  const createSignedMessage = (
    timestamp: number,
    signerPubkey: PublicKey,
    signerKeypair: Keypair
  ): { signature: Buffer; message: Buffer } => {
    const message = Buffer.from(`${timestamp}_${signerPubkey.toBase58()}`);
    const signature = nacl.sign.detached(message, signerKeypair.secretKey);
    return { signature: Buffer.from(signature), message };
  };

  const getCurrentTimestamp = async (): Promise<number> => {
    const clock = await provider.connection.getBlockTime(
      await provider.connection.getSlot()
    );
    return clock || Math.floor(Date.now() / 1000);
  };

  it("initializes settings", async () => {
    const settingsPda = getSettingsPda();

    await program.methods
      .initializeSettings({ windowSize })
      .accounts({
        signer: provider.wallet.publicKey,
        settings: settingsPda,
        rangeSigner: rangeSignerKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const settings = await program.account.settings.fetch(settingsPda);
    expect(settings.windowSize.toNumber()).to.equal(windowSize.toNumber());
    expect(settings.rangeSigner.toBase58()).to.equal(
      rangeSignerKeypair.publicKey.toBase58()
    );
  });

  it("verifies valid message within time window", async () => {
    const settingsPda = getSettingsPda();
    const currentTimestamp = await getCurrentTimestamp();
    const { signature, message } = createSignedMessage(
      currentTimestamp,
      provider.wallet.publicKey,
      rangeSignerKeypair
    );

    await program.methods
      .verifyRange(signature, message)
      .accounts({
        signer: provider.wallet.publicKey,
        settings: settingsPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  });

  it("fails for message outside time window", async () => {
    const settingsPda = getSettingsPda();
    const currentTimestamp = await getCurrentTimestamp();
    const outdatedTimestamp = currentTimestamp - windowSize.toNumber() - 100;
    const { signature, message } = createSignedMessage(
      outdatedTimestamp,
      provider.wallet.publicKey,
      rangeSignerKeypair
    );

    try {
      await program.methods
        .verifyRange(signature, message)
        .accounts({
          signer: provider.wallet.publicKey,
          settings: settingsPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      expect.fail("should have thrown TimestampOutOfWindow error");
    } catch (err) {
      expect(err.toString()).to.include("TimestampOutOfWindow");
    }
  });

  it("fails for message signed by wrong signer", async () => {
    const settingsPda = getSettingsPda();
    const currentTimestamp = await getCurrentTimestamp();
    const wrongSignerKeypair = Keypair.generate();
    const { signature, message } = createSignedMessage(
      currentTimestamp,
      provider.wallet.publicKey,
      wrongSignerKeypair
    );

    try {
      await program.methods
        .verifyRange(signature, message)
        .accounts({
          signer: provider.wallet.publicKey,
          settings: settingsPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      expect.fail("should have thrown CouldntVerifySignature error");
    } catch (err) {
      expect(err.toString()).to.include("CouldntVerifySignature");
    }
  });
});
