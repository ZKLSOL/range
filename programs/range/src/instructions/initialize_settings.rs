use crate::settings::Settings;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeSettingsArgs {
    pub window_size: u64,
}

#[derive(Accounts)]
#[anchor_lang::instruction(args: InitializeSettingsArgs)]
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

pub fn initialize_settings(
    ctx: Context<InitializeSettings>,
    args: InitializeSettingsArgs,
) -> Result<()> {
    let InitializeSettingsArgs { window_size } = args;
    let settings = &mut ctx.accounts.settings;
    let range_signer = &ctx.accounts.range_signer;
    settings.bump = ctx.bumps.settings;
    settings.range_signer = range_signer.key();
    settings.window_size = window_size;
    Ok(())
}
