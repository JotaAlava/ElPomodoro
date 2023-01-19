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

const Blog: React.FC = (props) => {
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
							<h1 className="fw-light">The Ultimate Remote Work Technique</h1>
							<p className="lead text-muted">
								An implementation of the pomodoro technique to support 10x
								remote work. Keep track of your goals, keep your work sessions
								focused, and your progress clearly tracked.
							</p>
						</div>
					</div>
					<div className="container px-4" id="featured-3">
						<h2 className="pb-2 border-bottom">Features</h2>
						<div className="row g-4 py-4 row-cols-1 row-cols-lg-3">
							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faCompass} />
								</div>
								<h3 className="fs-2">Prevent Distractions</h3>
								<p>
									Little distractions often derail the whole workday. Death by a
									thousand cuts. Staying focused is half the battle, the other
									half is keeping track of all the tasks that will need your
									attention.
								</p>
							</div>
							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faHourglass2} />
								</div>
								<h3 className="fs-2">Work/Life Balance</h3>
								<p>
									Keeping track of your actual daily performance will help you
									plan future work and will help you avoid having unrealistic
									expectations and working past the point of optimal
									productivity
								</p>
							</div>
							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faHandshake} />
								</div>
								<h3 className="fs-2">Tame Work</h3>
								<p>
									Not all work can be accurately scoped out from the start. Tame
									open-ended work by keeping track of your goals and your
									accomplishments.
								</p>
							</div>
							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faLightbulb} />
								</div>
								<h3 className="fs-2">Reveal Your Speed</h3>
								<p>
									Discover what you can actually accomplish in a day and across
									projects by using contexts to group the work completed.
								</p>
							</div>
							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faCirclePlay} />
								</div>
								<h3 className="fs-2">Gamified Goal-Setting</h3>
								<p>
									Enjoy the motivational bursts of seeing your TODO shrink, and
									your projects inch toward completion day by day.
								</p>
							</div>
							<div className="feature col">
								<div className="feature-icon d-inline-flex align-items-center justify-content-center bg-gradient fs-2 mb-3">
									<FontAwesomeIcon className="m-1" icon={faFaceKissBeam} />
								</div>
								<h3 className="fs-2">Completely Free</h3>
								<p>
									ElPomodoro is completely free but it is available for purchase
									so if you are interested in owning this tool reach out to:{' '}
									<Link href="mailto:admin@sophrosyn3.com">me</Link>
								</p>
							</div>
						</div>
					</div>
				</section>
			</Layout>
		</AppContext.Provider>
	);
};

export default Blog;
