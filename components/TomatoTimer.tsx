import React, { useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import Head from 'next/head';

const clockify = (timerValue) => {
	let minutes: any = Math.floor(timerValue / 60);
	let seconds: any = timerValue - minutes * 60;
	minutes = minutes < 10 ? '0' + minutes : minutes;
	seconds = seconds < 10 ? '0' + seconds : seconds;
	return `${minutes}:${seconds}`;
};

enum PomodoroTimer {
	Cookie = 'elPomodoroTimer',
	Sound = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
	// In Seconds....
	Work = 1500,
	ShortBreak = 300,
	LongBreak = 600
}

const initialState = {
	isRunning: false,
	// In seconds...
	time: PomodoroTimer.Work,
	workLength: PomodoroTimer.Work,
	shortBreakLength: PomodoroTimer.ShortBreak,
	longBreakLength: PomodoroTimer.LongBreak
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

	const start = () => {
		const newState = {
			...timerState,
			isRunning: true,
			time: timerState.workLength
		};

		Cookies.set(PomodoroTimer.Cookie, JSON.stringify(newState));

		setTimerState(newState);
	};

	const pause = () => {
		const newState = {
			...timerState,
			isRunning: !timerState.isRunning
		};

		Cookies.set(PomodoroTimer.Cookie, JSON.stringify(newState));

		setTimerState(newState);
	};

	const end = () => {
		const newState = {
			...timerState,
			isRunning: false,
			time: timerState.workLength
		};

		Cookies.set(PomodoroTimer.Cookie, JSON.stringify(newState));

		setTimerState(newState);
	};

	useEffect(() => {
		const interval = setInterval(() => {
			if (timerState.isRunning) {
				const newState = {
					...timerState,
					time: timerState.time - 1
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
			<p className="lead">Work</p>
			<button type="submit" className="btn btn-primary" onClick={start}>
				Start
			</button>
			<button type="submit" className="btn btn-warning ms-2" onClick={pause}>
				{timerState.isRunning ? 'Pause' : 'Play'}
			</button>
			<button type="submit" className="btn btn-primary ms-2" onClick={end}>
				Stop
			</button>
		</div>
	);
};

export default TomatoTimer;
