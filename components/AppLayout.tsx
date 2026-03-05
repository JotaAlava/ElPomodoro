import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useUser } from '@auth0/nextjs-auth0/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faHourglass2,
	faCompass,
	faChartBar
} from '@fortawesome/free-regular-svg-icons';

interface AppLayoutProps {
	children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
	const router = useRouter();
	const { user } = useUser();
	const isActive = (path: string) => router.pathname === path;

	return (
		<div className="app-layout">
			<Head>
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/apple-touch-icon.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="32x32"
					href="/favicon-32x32.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="16x16"
					href="/favicon-16x16.png"
				/>
				<link rel="manifest" href="/site.webmanifest" />
			</Head>

			<aside className="app-sidebar">
				<div className="app-sidebar__top">
					<a href="/" className="app-sidebar__logo">
						🍅
					</a>
					<nav className="app-sidebar__nav">
						<a
							href="/tomato"
							className={`app-sidebar__item${isActive('/tomato') ? ' app-sidebar__item--active' : ''}`}
						>
							<FontAwesomeIcon icon={faHourglass2} />
							<span>Timer</span>
						</a>
						<a
							href="/context"
							className={`app-sidebar__item${isActive('/context') ? ' app-sidebar__item--active' : ''}`}
						>
							<FontAwesomeIcon icon={faCompass} />
							<span>Contexts</span>
						</a>
						<a
							href="/dashboard"
							className={`app-sidebar__item${isActive('/dashboard') ? ' app-sidebar__item--active' : ''}`}
						>
							<FontAwesomeIcon icon={faChartBar} />
							<span>Stats</span>
						</a>
					</nav>
				</div>
				<div className="app-sidebar__bottom">
					{user && (
						<a
							href="/api/auth/logout"
							className="app-sidebar__item app-sidebar__item--user"
						>
							<div className="app-sidebar__avatar">
								{(user.name || user.email || '?')[0].toUpperCase()}
							</div>
							<span>Logout</span>
						</a>
					)}
				</div>
			</aside>

			<main className="app-main">{children}</main>
		</div>
	);
};

export default AppLayout;
