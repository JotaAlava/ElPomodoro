import React, { useState } from 'react';
import { GetStaticProps } from 'next';
import Layout from '../components/Layout';
import { useUser } from '@auth0/nextjs-auth0/client';
import { AppContext } from '../components/AppContext';
import Link from 'next/link';
import Todo from '../components/Todos';
import Tomatoes from '../components/Tomatoes';
import ContextPicker from '../components/ContextPicker';
import TomatoTimer from '../components/TomatoTimer';
import NewRow from '../components/NewRow';
import { PrismaClient, Tomato } from '@prisma/client';
import { getSession } from '@auth0/nextjs-auth0';

export const getStaticProps: GetStaticProps = async (context) => {
	return {
		props: {},
		revalidate: 10
	};
};

const Blog: React.FC = (props) => {
	const { user } = useUser();

	return (
		<AppContext.Provider
			value={{
				user
			}}
		>
			<Layout>
				<h1>Marketing Stuff Here for SEO</h1>
				<Link href={'/tomato'}>Pomodoro Timer</Link>
			</Layout>
		</AppContext.Provider>
	);
};

export default Blog;
