import {Keypair, PublicKey} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {Range} from "../target/types/range";
import {expect} from "chai";
import nacl from "tweetnacl";
import {
    getSettingsAddress,
    buildInitializeSettingsInstruction,
    buildVerifyRangeInstruction,
    processAndValidateTransaction,
    accountExists,
} from "../codama-ts-dca-custom";

describe("range", () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.range as Program<Range>;
    const provider = anchor.getProvider() as anchor.AnchorProvider;
    const connection = program.provider.connection;
    const payer = Keypair.generate();
    const rangeSignerKeypair = Keypair.generate();
    const windowSize = 60n;

    const createSignedMessage = (
        timestamp: number,
        signerPubkey: PublicKey,
        signerKeypair: Keypair
    ): { signature: Uint8Array; message: Uint8Array } => {
        const message = Buffer.from(`${timestamp}_${signerPubkey.toBase58()}`);
        const signature = nacl.sign.detached(message, signerKeypair.secretKey);
        return {signature: new Uint8Array(signature), message: new Uint8Array(message)};
    };

    const getCurrentTimestamp = async (): Promise<number> => {
        const slot = await connection.getSlot();
        const clock = await connection.getBlockTime(slot);
        return clock || Math.floor(Date.now() / 1000);
    };

    before(async () => {
        const airdropSignature = await connection.requestAirdrop(
            payer.publicKey,
            2_000_000_000
        );
        await connection.confirmTransaction(airdropSignature);
    });

    it("initializes settings", async () => {
        const [settingsPda] = getSettingsAddress();

        const instruction = await buildInitializeSettingsInstruction({
            signer: payer.publicKey,
            rangeSigner: rangeSignerKeypair.publicKey,
            windowSize,
        });

        await processAndValidateTransaction(connection, [instruction], payer);

        const exists = await accountExists(connection, settingsPda);
        expect(exists).to.be.true;
    });

    it("verifies valid message within time window", async () => {
        const currentTimestamp = await getCurrentTimestamp();
        const {signature, message} = createSignedMessage(
            currentTimestamp,
            payer.publicKey,
            rangeSignerKeypair
        );

        const instruction = await buildVerifyRangeInstruction({
            signer: payer.publicKey,
            signature,
            message,
        });

        await processAndValidateTransaction(connection, [instruction], payer);
    });

    it("fails for message outside time window", async () => {
        const currentTimestamp = await getCurrentTimestamp();
        const outdatedTimestamp = currentTimestamp - Number(windowSize) - 100;
        const {signature, message} = createSignedMessage(
            outdatedTimestamp,
            payer.publicKey,
            rangeSignerKeypair
        );

        const instruction = await buildVerifyRangeInstruction({
            signer: payer.publicKey,
            signature,
            message,
        });

        try {
            await processAndValidateTransaction(connection, [instruction], payer);
            expect.fail("should have thrown TimestampOutOfWindow error");
        } catch (err) {
            expect(err.toString()).to.include("TimestampOutOfWindow");
        }
    });

    it("fails for message signed by wrong signer", async () => {
        const currentTimestamp = await getCurrentTimestamp();
        const wrongSignerKeypair = Keypair.generate();
        const {signature, message} = createSignedMessage(
            currentTimestamp,
            payer.publicKey,
            wrongSignerKeypair
        );

        const instruction = await buildVerifyRangeInstruction({
            signer: payer.publicKey,
            signature,
            message,
        });

        try {
            await processAndValidateTransaction(connection, [instruction], payer);
            expect.fail("should have thrown CouldntVerifySignature error");
        } catch (err) {
            expect(err.toString()).to.include("CouldntVerifySignature");
        }
    });
});
