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

interface TodoItem {
	id: string;
	description: string;
	contextName?: string;
}

export interface TomatoTimerProps {
	onSessionChange?: (running: boolean) => void;
	onTimerComplete?: (description: string) => void;
	todayCount?: number;
	todos?: Array<TodoItem>;
	selectedContextName?: string;
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
	const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
	const [showDropdown, setShowDropdown] = useState(false);
	const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

	const bellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const triggerRef = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

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
						if (selectedTodo) props.onTimerComplete?.(selectedTodo.description);

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

	// Close dropdown on outside click
	useEffect(() => {
		if (!showDropdown) return;
		const handler = (e: MouseEvent) => {
			if (
				dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
				triggerRef.current && !triggerRef.current.contains(e.target as Node)
			) {
				setShowDropdown(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [showDropdown]);

	const openDropdown = () => {
		if (triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
		}
		setShowDropdown(true);
	};

	const selectTodo = (todo: TodoItem) => {
		setSelectedTodo(todo);
		setShowDropdown(false);
	};

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

			{/* Context band — narrow strip at the very top */}
			{props.selectedContextName && (
				<div style={{
					position: 'absolute',
					top: 0, left: 0, right: 0,
					background: '#009574',
					color: '#fff9ec',
					fontSize: '0.72rem',
					fontWeight: 600,
					letterSpacing: '0.12em',
					textTransform: 'uppercase',
					textAlign: 'center',
					padding: '0.3rem 1rem',
					zIndex: 10,
				}}>
					{props.selectedContextName}
				</div>
			)}

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
				<>
					{/* Trigger pill */}
					<div
						ref={triggerRef}
						className="timer-task"
						onClick={openDropdown}
						style={{ cursor: 'pointer', userSelect: 'none', minWidth: 240, justifyContent: 'space-between' }}
					>
						{selectedTodo ? (
							<>
								{selectedTodo.contextName && (
									<span style={{
										background: 'rgba(0,206,168,0.18)',
										color: '#00cea8',
										fontSize: '0.65rem',
										fontWeight: 700,
										letterSpacing: '0.08em',
										textTransform: 'uppercase',
										borderRadius: 999,
										padding: '0.1rem 0.55rem',
										marginRight: '0.6rem',
										whiteSpace: 'nowrap',
									}}>
										{selectedTodo.contextName}
									</span>
								)}
								<span className="timer-task__text" style={{ flex: 1 }}>{selectedTodo.description}</span>
								<button
									onClick={(e) => { e.stopPropagation(); setSelectedTodo(null); }}
									style={{ background: 'none', border: 'none', color: '#4d4637', fontSize: '1.1rem', lineHeight: 1, cursor: 'pointer', padding: '0 0 0 0.5rem' }}
									aria-label="Clear"
								>×</button>
							</>
						) : (
							<>
								<span style={{ color: '#4d4637', fontSize: '0.9rem', flex: 1 }}>Select a task…</span>
								<span style={{ color: '#4d4637', fontSize: '0.75rem' }}>▾</span>
							</>
						)}
					</div>

					{/* Dropdown — position:fixed to escape overflow:hidden on the section */}
					{showDropdown && (
						<div
							ref={dropdownRef}
							style={{
								position: 'fixed',
								top: dropdownPos.top,
								left: dropdownPos.left,
								width: Math.max(dropdownPos.width, 280),
								background: '#1a1610',
								border: '1px solid rgba(255,249,236,0.12)',
								borderRadius: 12,
								zIndex: 9999,
								maxHeight: 280,
								overflowY: 'auto',
								boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
							}}
						>
							{props.todos.map((t) => (
								<div
									key={t.id}
									onClick={() => selectTodo(t)}
									style={{
										display: 'flex',
										alignItems: 'center',
										padding: '0.6rem 1rem',
										cursor: 'pointer',
										borderBottom: '1px solid rgba(255,249,236,0.06)',
										transition: 'background 0.15s ease',
									}}
									onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,249,236,0.06)')}
									onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
								>
									{t.contextName && (
										<span style={{
											background: 'rgba(0,206,168,0.15)',
											color: '#00cea8',
											fontSize: '0.65rem',
											fontWeight: 700,
											letterSpacing: '0.08em',
											textTransform: 'uppercase',
											borderRadius: 999,
											padding: '0.15rem 0.55rem',
											marginRight: '0.65rem',
											whiteSpace: 'nowrap',
											flexShrink: 0,
										}}>
											{t.contextName}
										</span>
									)}
									<span style={{ color: '#fff9ec', fontSize: '0.88rem' }}>{t.description}</span>
								</div>
							))}
						</div>
					)}
				</>
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
