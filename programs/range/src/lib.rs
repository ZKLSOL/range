#![allow(ambiguous_glob_reexports)]
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("qU4JaorHz5P8XkB256mKastX4eS3dAkiYVwEo9P1cJ7");

#[program]
pub mod range {
    use super::*;

    pub fn initialize_settings(
        ctx: Context<InitializeSettings>,
        args: InitializeSettingsArgs,
    ) -> Result<()> {
        initialize_settings::initialize_settings(ctx, args)
    }

    pub fn verify_range(ctx: Context<VerifyRange>, args: VerifyRangeArgs) -> Result<()> {
        verify_range::verify_range(ctx, args)
    }
}
