import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient();

export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
