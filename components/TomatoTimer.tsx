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

export interface TomatoTimerProps {
	onSessionChange?: (running: boolean) => void;
	onTimerComplete?: (description: string) => void;
	todayCount?: number;
	todos?: Array<{ id: string; description: string }>;
}

const TomatoTimer: React.FC<TomatoTimerProps> = (props) => {
	const loadCookieState = () => {
		if (Cookies.get(PomodoroTimer.Cookie)) {
			return JSON.parse(Cookies.get(PomodoroTimer.Cookie));
		}
	};

	const [timerState, setTimerState] = useState(
		loadCookieState() || initialState
	);
	const [selectedTodo, setSelectedTodo] = useState<string>('');

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
		props.onSessionChange?.(mode === PomodoroTimer.WorkMode);
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
		props.onSessionChange?.(timerState.mode === PomodoroTimer.WorkMode);
	};

	const end = () => {
		clearBellInterval();
		const newState = {
			...timerState,
			started: undefined
		};

		Cookies.set(PomodoroTimer.Cookie, JSON.stringify(newState));
		setTimerState(newState);
		props.onSessionChange?.(false);
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
						props.onSessionChange?.(false);
						if (selectedTodo) props.onTimerComplete?.(selectedTodo);

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
	const isRunning = !!timerState.started;
	const canResume = !isRunning && !isOverdue && !!timerState.time && timerState.time > 0 && timerState.time < (timerState.sessionLength || PomodoroTimer.Work);

	const getActiveMode = (): 'work' | 'short' | 'long' => {
		if (timerState.mode === PomodoroTimer.BreakMode) {
			return timerState.sessionLength === PomodoroTimer.ShortBreak ? 'short' : 'long';
		}
		return 'work';
	};

	let mainBtnIcon: string;
	let mainBtnLabel: string;
	let mainBtnAction: () => void;
	if (isRunning) {
		mainBtnIcon = '⏸'; mainBtnLabel = 'Pause'; mainBtnAction = end;
	} else if (isOverdue) {
		mainBtnIcon = '☕'; mainBtnLabel = 'Take a break'; mainBtnAction = () => start(PomodoroTimer.ShortBreak, PomodoroTimer.BreakMode);
	} else if (canResume) {
		mainBtnIcon = '▶'; mainBtnLabel = 'Resume'; mainBtnAction = resume;
	} else {
		mainBtnIcon = '▶'; mainBtnLabel = 'Start'; mainBtnAction = () => start(PomodoroTimer.Work, PomodoroTimer.WorkMode);
	}

	const sectionClass = [
		'timer-fold',
		isOverdue && overdueCount >= 2 ? 'timer-fold--overdue' : '',
		isRunning ? 'timer-running' : ''
	].filter(Boolean).join(' ');

	const activeModeKey = getActiveMode();

	return (
		<section
			className={sectionClass}
			style={isOverdue && overdueCount >= 2 ? { animation: 'blink 1s step-start infinite' } : {}}
		>
			<style>{`@keyframes blink { 50% { opacity: 0.3; } }`}</style>
			<Head>
				<title>{clockify(timerState.time)}</title>
			</Head>
			<audio id="beep" src={PomodoroTimer.Sound.toString()} preload="auto" />

			{/* Mode tabs — hidden while running to reduce distraction */}
			{!isRunning && (
				<div className="timer-fold__modes">
					{([
						{ label: 'Work', length: PomodoroTimer.Work, mode: PomodoroTimer.WorkMode, key: 'work' },
						{ label: 'Short Break', length: PomodoroTimer.ShortBreak, mode: PomodoroTimer.BreakMode, key: 'short' },
						{ label: 'Long Break', length: PomodoroTimer.LongBreak, mode: PomodoroTimer.BreakMode, key: 'long' },
					] as const).map(({ label, length, mode, key }) => (
						<button
							key={key}
							className={`timer-mode${activeModeKey === key ? ' timer-mode--active' : ''}`}
							onClick={() => start(length, mode)}
						>
							{label}
						</button>
					))}
				</div>
			)}

			{/* Todo picker */}
			{props.todos && props.todos.length > 0 && (
				<div className="timer-task" style={{ padding: '0.35rem 0.75rem 0.35rem 1.25rem' }}>
					<select
						value={selectedTodo}
						onChange={(e) => setSelectedTodo(e.target.value)}
						style={{
							background: 'transparent',
							border: 'none',
							color: selectedTodo ? '#fff9ec' : '#4d4637',
							fontSize: '0.9rem',
							outline: 'none',
							flex: 1,
							cursor: 'pointer',
							minWidth: 0,
						}}
					>
						<option value="" style={{ background: '#1a1610', color: '#4d4637' }}>
							Select a task…
						</option>
						{props.todos.map((t) => (
							<option key={t.id} value={t.description} style={{ background: '#1a1610', color: '#fff9ec' }}>
								{t.description}
							</option>
						))}
					</select>
					{selectedTodo && (
						<button
							onClick={() => setSelectedTodo('')}
							style={{
								background: 'none',
								border: 'none',
								color: '#4d4637',
								fontSize: '1.1rem',
								lineHeight: 1,
								cursor: 'pointer',
								padding: '0 0 0 0.5rem',
							}}
							aria-label="Clear selection"
						>
							×
						</button>
					)}
				</div>
			)}

			{/* Timer display */}
			<div className="timer-display">{clockify(timerState.time)}</div>

			{/* Session count + status */}
			<div className="timer-session-count">
				FOCUS 🍅 {props.todayCount ?? 0} / 4
			</div>

			{/* Main action button */}
			<button
				className={`timer-main-btn${isRunning ? ' timer-main-btn--active' : ''}`}
				onClick={mainBtnAction}
				aria-label={mainBtnLabel}
			>
				{mainBtnIcon}
			</button>

			{/* Secondary actions */}
			{!isRunning && (
				<div className="timer-secondary-actions">
					{canResume && (
						<button className="timer-secondary-btn" onClick={resume}>Resume</button>
					)}
					{isOverdue ? (
						<button className="timer-secondary-btn" onClick={() => start(300, PomodoroTimer.WorkMode)}>5 More Minutes</button>
					) : (
						<>
							<button className="timer-secondary-btn" onClick={() => start(PomodoroTimer.ShortBreak, PomodoroTimer.BreakMode)}>Short Break</button>
							<button className="timer-secondary-btn" onClick={() => start(PomodoroTimer.LongBreak, PomodoroTimer.BreakMode)}>Long Break</button>
						</>
					)}
					{!isOverdue && !canResume && (
						<button className="timer-secondary-btn" onClick={end}>Stop</button>
					)}
				</div>
			)}

			{/* Wave decoration */}
			<div className="timer-wave" aria-hidden="true">
				<div className="timer-wave__line timer-wave__line--1" />
				<div className="timer-wave__line timer-wave__line--2" />
			</div>
		</section>
	);
};

export default TomatoTimer;
