use anchor_lang::prelude::*;

#[account]
pub struct Settings {
    pub bump: u8,
    pub window_size: u64,
    pub range_signer: Pubkey,
}

impl Settings {
    pub const SIZE: usize =
        // discriminator
        8 +
        // bump
        size_of::<u8>() +
        // window_size 
        size_of::<u64>() +
        // range_signer
        size_of::<Pubkey>();
    pub const SEED: &'static str = "Settings";
}
