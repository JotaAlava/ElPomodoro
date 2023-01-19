import React from 'react';

const TomatoTimer: React.FC = (props) => {
	return (
		<div className="jumbotron text-center pb-3">
			<h1 className="display-1">25:00</h1>
			<p className="lead">Work</p>
			<button type="submit" className="btn btn-primary">
				Start
			</button>
			<button type="submit" className="btn btn-primary ms-2">
				Stop
			</button>
		</div>
	);
};

export default TomatoTimer;
