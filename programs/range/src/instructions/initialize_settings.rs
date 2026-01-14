use crate::settings::Settings;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeSettings<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(init,
    payer = signer,
    seeds = [Settings::SEED.as_bytes()],
    space = Settings::SIZE,
    bump
    )]
    pub settings: Box<Account<'info, Settings>>,
    /// CHECK: can be any account
    pub range_signer: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_settings(ctx: Context<InitializeSettings>) -> Result<()> {
    let settings = &mut ctx.accounts.settings;
    let range_signer = &ctx.accounts.range_signer;
    settings.bump = ctx.bumps.settings;
    settings.range_signer = range_signer.key();
    Ok(())
}
