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
	Sound = 'https://www.soundjay.com/misc_c2026/sounds/bell-ringing-05.mp3',
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
	sessionLength: PomodoroTimer.Work,
	overdueCount: 0
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

	const bellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const playBell = () => {
		(document.getElementById('beep') as any)?.play();
	};

	const clearBellInterval = () => {
		if (bellIntervalRef.current) {
			clearInterval(bellIntervalRef.current);
			bellIntervalRef.current = null;
		}
	};

	const start = (length, mode) => {
		clearBellInterval();
		const newState = {
			...timerState,
			time: length,
			sessionLength: length,
			started: new Date(),
			mode,
			overdueCount: 0
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
		clearBellInterval();
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
					const isWork = timerState.mode === PomodoroTimer.WorkMode;

					if (isWork) {
						// Escalating overdue: don't reset, increment overdueCount
						playBell();
						const newOverdueCount = (timerState.overdueCount || 0) + 1;
						const overdueState = {
							...timerState,
							time: 0,
							started: undefined,
							mode: 'Time is up! Take a break.',
							overdueCount: newOverdueCount
						};
						setTimerState(overdueState);
						Cookies.set(PomodoroTimer.Cookie, JSON.stringify(overdueState));

						// Re-ring bell every 60s
						clearBellInterval();
						bellIntervalRef.current = setInterval(() => {
							playBell();
						}, 60000);
					} else {
						// Break ended — normal reset
						clearBellInterval();
						(document.getElementById('beep') as any)?.play();
						setTimerState(initialState);
						Cookies.set(PomodoroTimer.Cookie, JSON.stringify(initialState));
					}
				} else {
					setTimerState(newState);
					Cookies.set(PomodoroTimer.Cookie, JSON.stringify(newState));
				}
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [timerState]);

	// Clear bell interval on unmount
	useEffect(() => {
		return () => clearBellInterval();
	}, []);

	const isOverdue = !timerState.started && timerState.mode === 'Time is up! Take a break.';
	const overdueCount = timerState.overdueCount || 0;
	const jumbotronClass = `jumbotron text-center pb-3${isOverdue && overdueCount >= 2 ? ' border border-danger' : ''}`;

	return (
		<div className={jumbotronClass} style={isOverdue && overdueCount >= 2 ? { animation: 'blink 1s step-start infinite' } : {}}>
			<style>{`@keyframes blink { 50% { opacity: 0.4; } }`}</style>
			<Head>
				<title>{clockify(timerState.time)}</title>
			</Head>
			<h1 className="display-1">{clockify(timerState.time)}</h1>
			<audio id="beep" src={PomodoroTimer.Sound.toString()} preload="auto" />
			<p className="lead">{timerState.mode}</p>
			{isOverdue ? (
				<div>
					<button
						type="button"
						className="btn btn-success me-2"
						onClick={() => start(PomodoroTimer.ShortBreak, PomodoroTimer.BreakMode)}
					>
						Start Break
					</button>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => start(300, PomodoroTimer.WorkMode)}
					>
						5 More Minutes
					</button>
				</div>
			) : (
				<>
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
				</>
			)}
		</div>
	);
};

export default TomatoTimer;
