import { useUser } from '@auth0/nextjs-auth0/client';
import { LoginLink } from '../../components/LoginLink';
import LogoutLink from '../../components/LogoutLink';

const Login = () => {
	const { user, error, isLoading } = useUser();
	console.log('this ran');
	return (
		<>
			<h1>You need to login</h1>
			{JSON.stringify(user) || <LoginLink></LoginLink>}
			<LogoutLink></LogoutLink>
		</>
	);
};

export default Login;
