use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Custom error message")]
    CustomError,
    #[msg("Timestamp Parsing Failed")]
    TimestampParsingFailed,
    #[msg("Pubkey Parsing Failed")]
    PubkeyParsingFailed,
    #[msg("Wrong Message Split Length")]
    WrongMessageSplitLength,
    #[msg("Wrong Signer")]
    WrongSigner,
    #[msg("Couldnt Verify Signature")]
    CouldntVerifySignature,
    #[msg("Timestamp Out Of Window")]
    TimestampOutOfWindow,
}
