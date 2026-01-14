use crate::settings::Settings;
use anchor_lang::prelude::*;

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

    Ok(())
}
