import React, { useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import Head from 'next/head';

const clockify = (timerValue) => {
	timerValue = timerValue || PomodoroTimer.Work;
	let minutes: any = Math.floor(timerValue / 60);
	let seconds: any = timerValue - minutes * 60;
	minutes = minutes < 10 ? '0' + minutes : minutes;
	seconds = seconds < 10 ? '0' + Math.trunc(seconds) : Math.trunc(seconds);
	return `${minutes}:${seconds}`;
};

enum PomodoroTimer {
	Cookie = 'elPomodoroTimer',
	Sound = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
	WorkMode = 'Work',
	BreakMode = 'Break',
	// In Seconds....
	Work = 1500,
	ShortBreak = 300,
	LongBreak = 600
}

const initialState = {
	mode: 'Welcome. Ready to work?',
	started: undefined,
	// In seconds...
	sessionLength: PomodoroTimer.Work
};

const TomatoTimer: React.FC = (props) => {
	const loadCookieState = () => {
		if (Cookies.get(PomodoroTimer.Cookie)) {
			return JSON.parse(Cookies.get(PomodoroTimer.Cookie));
		}
	};

	const [timerState, setTimerState] = useState(
		loadCookieState() || initialState
	);

	const start = (length, mode) => {
		const newState = {
			...timerState,
			time: length,
			sessionLength: length,
			started: new Date(),
			mode
		};

		Cookies.set(PomodoroTimer.Cookie, JSON.stringify(newState));

		setTimerState(newState);
	};

	const resume = () => {
		const subtractSeconds = (date, seconds) => {
			date.setSeconds(date.getSeconds() - seconds);

			return date;
		};

		const newState = {
			...timerState,
			started: subtractSeconds(
				new Date(),
				timerState.sessionLength - timerState.time
			)
		};

		Cookies.set(PomodoroTimer.Cookie, JSON.stringify(newState));

		setTimerState(newState);
	};

	const end = () => {
		const newState = {
			...timerState,
			started: undefined
		};

		Cookies.set(PomodoroTimer.Cookie, JSON.stringify(newState));

		setTimerState(newState);
	};

	const secondsSince = (started) => {
		const x = new Date(started);
		const y = new Date();
		const seconds = Math.abs(x.getTime() - y.getTime()) / 1000;
		return Math.trunc(seconds);
	};

	useEffect(() => {
		const interval = setInterval(() => {
			if (timerState.started) {
				const seconds = secondsSince(timerState.started);

				const newState = {
					...timerState,
					time: timerState.sessionLength - seconds
				};

				if (newState.time <= 0) {
					(document.getElementById('beep') as any).play();

					setTimerState(initialState);
					Cookies.set(PomodoroTimer.Cookie, JSON.stringify(initialState));
				} else {
					setTimerState(newState);
					Cookies.set(PomodoroTimer.Cookie, JSON.stringify(newState));
				}
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [timerState]);

	return (
		<div className="jumbotron text-center pb-3">
			<Head>
				<title>{clockify(timerState.time)}</title>
			</Head>
			<h1 className="display-1">{clockify(timerState.time)}</h1>
			<audio id="beep" src={PomodoroTimer.Sound.toString()} preload="auto" />
			<p className="lead">{timerState.mode}</p>
			<button
				type="submit"
				className="btn btn-primary"
				onClick={() => start(PomodoroTimer.Work, PomodoroTimer.WorkMode)}
			>
				Start
			</button>
			<button type="submit" className="btn btn-primary ms-2" onClick={end}>
				Stop
			</button>
			<div className="pt-2">
				<button type="submit" className="btn btn-warning ms-2" onClick={resume}>
					Resume
				</button>
				<button
					type="submit"
					className="btn btn-warning ms-2"
					onClick={() =>
						start(PomodoroTimer.ShortBreak, PomodoroTimer.BreakMode)
					}
				>
					Short Break
				</button>
				<button
					type="submit"
					className="btn btn-warning ms-2"
					onClick={() =>
						start(PomodoroTimer.LongBreak, PomodoroTimer.BreakMode)
					}
				>
					Long Break
				</button>
			</div>
		</div>
	);
};

export default TomatoTimer;
