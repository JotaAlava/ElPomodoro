// import 'bootstrap/dist/css/bootstrap.css';
// import '../css/main.css';
import '../scss/main.scss';

import { AppProps } from 'next/app';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { useEffect } from 'react';

const App = ({ Component, pageProps }: AppProps) => {
	useEffect(() => {
		require('bootstrap/dist/js/bootstrap.bundle.min.js');
	}, []);

	return (
		<UserProvider>
			<Component {...pageProps} />
		</UserProvider>
	);
};

export default App;
