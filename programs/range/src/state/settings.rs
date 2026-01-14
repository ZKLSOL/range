use anchor_lang::prelude::*;

#[account]
pub struct Settings {
    pub bump: u8,
    pub range_signer: Pubkey,
}

impl Settings {
    pub const SIZE: usize =
        // discriminator
        8 +
        // bump
        size_of::<u8>() +
        // range_signer
        size_of::<Pubkey>();
    pub const SEED: &'static str = "Settings";
}
