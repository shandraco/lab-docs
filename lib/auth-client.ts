import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/** Browser side of Better Auth. Same origin, so no baseURL and no extra CSP origins. */
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
