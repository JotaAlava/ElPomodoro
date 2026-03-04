import React from 'react';
import { GetStaticProps } from 'next';
import { useUser } from '@auth0/nextjs-auth0/client';
import { AppContext } from '../components/AppContext';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faCirclePlay,
	faCompass,
	faFaceKissBeam,
	faHandshake,
	faHourglass2,
	faLightbulb
} from '@fortawesome/free-regular-svg-icons';

export const getStaticProps: GetStaticProps = async () => {
	return { props: {}, revalidate: 10 };
};

const features = [
	{
		icon: faCirclePlay,
		title: 'Just press start',
		body: 'No planning paralysis. Pick a task, hit start, and commit to 25 minutes. Breaking work into small sessions makes starting feel possible instead of overwhelming.'
	},
	{
		icon: faHourglass2,
		title: 'Time you can actually see',
		body: 'Time blindness is real. The timer makes time tangible — you always know exactly where you are in a session, and the break bell pulls you up for air before the afternoon disappears.'
	},
	{
		icon: faLightbulb,
		title: 'Capture everything, stress about nothing',
		body: "Dump every task and stray thought into your todo list the moment it hits you. Nothing gets lost to the void. When you start a session, you decide what matters right now."
	},
	{
		icon: faCompass,
		title: 'Know where your focus actually went',
		body: 'Contexts tag each session so you can see at a glance whether you spent the week on things that matter. Set weekly minimums per context and watch progress in real time.'
	},
	{
		icon: faHandshake,
		title: 'Progress you can feel',
		body: 'ADHD makes effort feel invisible. Session counts make it concrete — on the days that felt unproductive, the numbers often tell a different story.'
	},
	{
		icon: faFaceKissBeam,
		title: 'Completely free',
		body: 'No subscription, no upsell, no premium tier. ElPomodoro is free to use. Reach out if you\'re interested in owning it.'
	}
];

const LandingPage: React.FC = () => {
	const { user } = useUser();

	return (
		<AppContext.Provider value={{ user }}>
			<Head>
				<title>ElPomodoro — Focus Timer for ADHD</title>
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
				<link rel="manifest" href="/site.webmanifest" />
			</Head>

			{/* ── Nav ─────────────────────────────────────────────── */}
			<nav className="landing-nav">
				<span className="landing-nav__brand">🍅 ElPomodoro</span>
				<div className="landing-nav__links">
					{user ? (
						<a href="/tomato" className="landing-nav__cta">Open app →</a>
					) : (
						<>
							<a href="/api/auth/login?returnTo=/tomato" className="landing-nav__link">Log in</a>
							<a href="/api/auth/login?returnTo=/tomato" className="landing-nav__cta">Get started free</a>
						</>
					)}
				</div>
			</nav>

			{/* ── Hero ────────────────────────────────────────────── */}
			<section className="landing-hero">
				<div className="landing-hero__modes">
					<span className="landing-mode landing-mode--active">Work</span>
					<span className="landing-mode">Short Break</span>
					<span className="landing-mode">Long Break</span>
				</div>

				<div className="landing-timer">25:00</div>

				<p className="landing-hero__subtitle">Work Session · 25 minutes</p>

				<h1 className="landing-hero__headline">
					Built for brains that won't slow down.
				</h1>
				<p className="landing-hero__body">
					Focus tracker designed for ADHD. Time-box your work, track real
					progress, and build the habit of starting.
				</p>

				{user ? (
					<a href="/tomato" className="landing-btn-primary">
						Open your dashboard →
					</a>
				) : (
					<div className="landing-hero__actions">
						<a href="/api/auth/login?returnTo=/tomato" className="landing-btn-primary">
							Get started — it's free
						</a>
						<a href="/api/auth/login?returnTo=/tomato" className="landing-btn-ghost">
							Log in
						</a>
					</div>
				)}

				<div className="landing-hero__scroll" aria-hidden="true">↓</div>
			</section>

			{/* ── Features ────────────────────────────────────────── */}
			<section className="landing-features">
				<div className="container">
					<h2 className="landing-features__heading">Why it works for ADHD</h2>
					<div className="row g-4 row-cols-1 row-cols-md-2 row-cols-lg-3">
						{features.map((f, i) => (
							<div className="col" key={i}>
								<div className="landing-feature-card">
									<div className="landing-feature-card__icon">
										<FontAwesomeIcon icon={f.icon} style={{ width: 22, color: '#009574' }} />
									</div>
									<h3 className="landing-feature-card__title">{f.title}</h3>
									<p className="landing-feature-card__body">{f.body}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Footer ──────────────────────────────────────────── */}
			<footer className="landing-footer">
				<span>🍅 ElPomodoro</span>
				<span style={{ opacity: 0.4 }}>·</span>
				<a href="mailto:admin@sophrosyn3.com" className="landing-footer__link">Contact</a>
			</footer>
		</AppContext.Provider>
	);
};

export default LandingPage;
