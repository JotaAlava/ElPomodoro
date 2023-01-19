import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export { default } from 'next-auth/middleware';
// export default withAuth({
// 	pages: {
// 		//signIn: '/login'
// 	}
// });

// export function middleware(request: NextRequest) {
// 	return NextResponse.redirect(new URL('/login', request.url));
// }

// This is a list of routes for which this middleware will apply!
// TODO: Find out why this has to be a magic string and cannot be a variable....
export const config = {
	matcher: []
};
