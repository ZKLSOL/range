use crate::error::ErrorCode;
use crate::settings::Settings;
use anchor_lang::prelude::*;
use brine_ed25519::sig_verify;
use std::str::FromStr;

pub struct ExtractedMessage {
    pub timestamp: u64,
    pub pubkey: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct VerifyRangeArgs {
    pub signature: Vec<u8>,
    pub message: Vec<u8>,
}

#[derive(Accounts)]
#[anchor_lang::instruction(args: VerifyRangeArgs)]
pub struct VerifyRange<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
    seeds = [Settings::SEED.as_bytes()],
    bump = settings.bump
    )]
    pub settings: Box<Account<'info, Settings>>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn verify_range(ctx: Context<VerifyRange>, args: VerifyRangeArgs) -> Result<()> {
    let VerifyRangeArgs { signature, message } = args;
    let clock = Clock::get()?;
    let current_timestamp = clock.unix_timestamp as u64;
    let settings = &ctx.accounts.settings;
    let ExtractedMessage { timestamp, pubkey } = extract_message(&message)?;
    require_keys_eq!(settings.range_signer.key(), pubkey, ErrorCode::WrongSigner);
    require!(
        current_timestamp + settings.window_size > timestamp,
        ErrorCode::TimestampTooBig
    );
    require!(
        current_timestamp - settings.window_size < timestamp,
        ErrorCode::TimestampTooSmall
    );
    sig_verify(
        &settings.range_signer.key().to_bytes(),
        &signature,
        &message,
    )
    .map_err(|_| ErrorCode::CouldntVerifySignature)?;
    Ok(())
}

pub fn extract_message(message_bytes: &[u8]) -> Result<ExtractedMessage> {
    let message_string = String::from_utf8_lossy(message_bytes);
    let parts: Vec<&str> = message_string.split('_').collect();
    require_eq!(parts.len(), 2, ErrorCode::WrongMessageSplitLength);
    let timestamp_str = parts[0];
    let pubkey_str = parts[1];
    let timestamp = timestamp_from_string(timestamp_str)?;
    let pubkey = pubkey_from_string(pubkey_str)?;
    Ok(ExtractedMessage { timestamp, pubkey })
}

pub fn timestamp_from_string(timestamp: &str) -> Result<u64> {
    timestamp
        .parse::<u64>()
        .map_err(|_| ErrorCode::TimestampParsingFailed.into())
}

pub fn pubkey_from_string(pubkey: &str) -> Result<Pubkey> {
    Pubkey::from_str(pubkey).map_err(|_| ErrorCode::PubkeyParsingFailed.into())
}
