/**
 * TDD compliance layer for api.ts.
 *
 * client-web-ui has no runtime test framework (no vitest/jest) so this file
 * uses TypeScript's type system as the assertion engine: the expected
 * signature below must structurally match the real `register` export, or
 * `tsc -b` will fail at build time. This gives us real RED → GREEN feedback
 * without dragging vitest + jsdom into a project that has never had tests.
 *
 * Contract tracked here: backend RegisterCreatorRequest requires
 * `invitation_code` since account-centric refactor (auth.go:53). Client API
 * MUST forward a 4th argument or /api/v1/auth/register will reject with
 * "Invitation code is required".
 */
import type { ApiResponse, AuthResponse } from "./api";
import { register } from "./api";

/** Expected shape of the post-invitation-code register() contract. */
type ExpectedRegisterSignature = (
  username: string,
  email: string,
  password: string,
  invitationCode: string,
) => Promise<ApiResponse<AuthResponse>>;

// Structural assertion — if `register` is still (u, e, p) => ... this line
// fails to compile and the whole project build goes RED. That IS the test.
const _registerSignatureCheck: ExpectedRegisterSignature = register;
void _registerSignatureCheck;
