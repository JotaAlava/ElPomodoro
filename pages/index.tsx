import React from 'react';
import { GetStaticProps } from 'next';
import Layout from '../components/Layout';
import { useUser } from '@auth0/nextjs-auth0/client';
import { AppContext } from '../components/AppContext';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faCirclePlay,
	faCompass,
	faFaceKissBeam,
	faHandshake,
	faHourglass2,
	faLightbulb
} from '@fortawesome/free-regular-svg-icons';

export const getStaticProps: GetStaticProps = async (context) => {
	return {
		props: {},
		revalidate: 10
	};
};

const LandingPage: React.FC = (props) => {
	const { user } = useUser();

	return (
		<AppContext.Provider
			value={{
				user
			}}
		>
			<Layout>
				<section className="text-center container">
					<div className="row py-lg-5">
						<div className="col-lg-6 col-md-8 mx-auto">
							<h1 className="fw-light">Built for brains that won't slow down.</h1>
							<p className="lead text-muted">
								ElPomodoro is a focus tracker designed around how ADHD brains
								actually work — time-boxed sessions, visible progress, and just
								enough structure to keep you moving without getting in your way.
							</p>
							{user ? (
								<Link href="/tomato" className="btn btn-primary btn-lg mt-2">
									Go to your dashboard
								</Link>
							) : (
								<a
									href="/api/auth/login?returnTo=/tomato"
									className="btn btn-primary btn-lg mt-2"
								>
									Get started — it's free
								</a>
							)}
						</div>
					</div>

					<div className="container px-4" id="featured-3">
						<h2 className="pb-2 border-bottom">Why it works for ADHD</h2>
						<div className="row g-4 py-4 row-cols-1 row-cols-lg-3">

							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faCirclePlay} />
								</div>
								<h3 className="fs-2">Just press start</h3>
								<p>
									No planning paralysis. Pick a task, hit start, and commit to
									25 minutes — that's it. Breaking work into small sessions
									makes starting feel possible instead of overwhelming.
								</p>
							</div>

							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faHourglass2} />
								</div>
								<h3 className="fs-2">Time you can actually see</h3>
								<p>
									Time blindness is real. The timer makes time tangible — you
									always know exactly where you are in a session, and the
									break bell pulls you up for air before the whole afternoon
									disappears.
								</p>
							</div>

							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faLightbulb} />
								</div>
								<h3 className="fs-2">Capture everything, stress about nothing</h3>
								<p>
									Dump every task and stray thought into your todo list the
									moment it hits you. Nothing gets lost to the void. When you
									start a session, you decide what matters right now — not your
									past self.
								</p>
							</div>

							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faCompass} />
								</div>
								<h3 className="fs-2">Know where your focus actually went</h3>
								<p>
									Contexts tag each session so you can see at a glance whether
									you spent the week on the things that matter. Set weekly
									minimums per context and watch your progress in real time.
								</p>
							</div>

							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faHandshake} />
								</div>
								<h3 className="fs-2">Progress you can feel</h3>
								<p>
									ADHD makes effort feel invisible. Session counts make it
									concrete — on the days that felt unproductive, the numbers
									often tell a different story. Seeing real output is its own
									motivation.
								</p>
							</div>

							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faFaceKissBeam} />
								</div>
								<h3 className="fs-2">Completely free</h3>
								<p>
									No subscription, no upsell, no premium tier. ElPomodoro is
									free to use.{' '}
									<Link href="mailto:admin@sophrosyn3.com">
										Reach out
									</Link>{' '}
									if you're interested in owning it.
								</p>
							</div>

						</div>
					</div>
				</section>
			</Layout>
		</AppContext.Provider>
	);
};

export default LandingPage;
