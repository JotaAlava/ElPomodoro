import { handleAuth } from '@auth0/nextjs-auth0';

export default handleAuth();

export const config = {
	pages: {
		signIn: '/login',
		signOut: '/auth/signout',
		error: '/login', // Error code passed in query string as ?error=
		verifyRequest: '/auth/verify-request', // (used for check email message)
		newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out if not of interest)
	}
};
