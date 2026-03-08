import { createAuthClient } from "better-auth/client";

function getAuthBaseURL(): string {
	if (typeof window !== "undefined") {
		return window.location.origin;
	}
	return import.meta.env.PUBLIC_BETTER_AUTH_URL || "http://localhost:4321";
}

export const authClient = createAuthClient({
	baseURL: getAuthBaseURL(),
});

export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
