import React from 'react';
import { useRouter } from 'next/router';

const Header: React.FC = () => {
	const router = useRouter();
	const isActive: (pathname: string) => boolean = (pathname) =>
		router.pathname === pathname;

	return (
		<header>
			<div className="collapse bg-dark" id="navbarHeader">
				<div className="container">
					<div className="row">
						<div className="col-sm-8 col-md-7 py-4">
							<h4 className="text-white">About</h4>
							<p className="text-muted">
								Remote work required that I make some personal adjustments for
								optimal productivity. I found the Pomodoro technique
								significantly helpful for staying on task on my projects. On its
								own, it wasn't enough. So I've added a few concepts such as
								"contexts" and "todos". Personally, I find it helpful to arrange
								my tasks for the day in an unordered todo list and then assign a
								proper context to each as I start working on it. This tool is
								public and free. Enjoy.
							</p>
						</div>
						<div className="col-sm-4 offset-md-1 py-4">
							<h4 className="text-white">Contact</h4>
							<ul className="list-unstyled">
								<li>
									<a
										href="https://www.youtube.com/channel/UCAEeRJrd3IgL30f_3A4FBOw"
										className="text-white"
									>
										Follow on YT
									</a>
								</li>
								<li>
									<a href="mailto:me@josealava.com" className="text-white">
										Email me
									</a>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			<div className="navbar navbar-dark bg-dark shadow-sm">
				<div className="container">
					<div className="navbar-brand d-flex align-items-center">
						<strong>ElPomodoro</strong>
						<div className="col-sm-12 d-flex justify-content-center">
							<ul className="nav nav-pills">
								<li className="nav-item">
									<a
										href="/"
										className={isActive('/') ? 'nav-link active' : 'nav-link'}
										aria-current="page"
									>
										Home
									</a>
								</li>
								<li className="nav-item">
									<a
										href="/tomato"
										className={
											isActive('/tomato') ? 'nav-link active' : 'nav-link'
										}
									>
										Tomato
									</a>
								</li>
								<li className="nav-item">
									<a
										href="/context"
										className={
											isActive('/context') ? 'nav-link active' : 'nav-link'
										}
									>
										Context
									</a>
								</li>
							</ul>
						</div>
					</div>
					<button
						className="navbar-toggler"
						type="button"
						data-bs-toggle="collapse"
						data-bs-target="#navbarHeader"
						aria-controls="navbarHeader"
						aria-expanded="false"
						aria-label="Toggle navigation"
					>
						<span className="navbar-toggler-icon"></span>
					</button>
				</div>
			</div>
		</header>
	);
};

export default Header;
