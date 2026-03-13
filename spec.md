# Old Chapel Studios App

## Current State
The backend `main.mo` correctly defines `bootstrapAdmin`, but the deployed canister does not export it (IC0536). The source code is correct; the canister simply needs to be rebuilt and redeployed.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Trigger a clean rebuild to push the existing correct `bootstrapAdmin` method to the live canister

### Remove
- Nothing

## Implementation Plan
1. Force a rebuild by making a no-op whitespace touch to main.mo to ensure the build system picks up the latest code
2. Deploy to update the live canister
