import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareFromSquare } from '@fortawesome/free-regular-svg-icons';
import AppLayout from '../../components/AppLayout';
import { AppContext } from '../../components/AppContext';
import Todo, { IdName } from '../../components/Todos';
import Tomatoes from '../../components/Tomatoes';
import ContextPicker from '../../components/ContextPicker';
import TomatoTimer from '../../components/TomatoTimer';
import NewRow from '../../components/NewRow';
import { Context, PrismaClient, Tomato } from '@prisma/client';
import TomatoService from '../../services/tomatoService';
import { getSession, withPageAuthRequired } from '@auth0/nextjs-auth0';
import { loadTodos } from '../../services/todoService';

const toDateKey = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const computeStreak = (tomatoes: Array<any>): number => {
	if (!tomatoes.length) return 0;

	const uniqueDays = new Set<string>();
	tomatoes.forEach((t) => {
		const d = new Date(t.finished * 1000);
		uniqueDays.add(toDateKey(d));
	});

	const today = new Date();
	const todayKey = toDateKey(today);

	const checkDate = new Date(today);
	if (!uniqueDays.has(todayKey)) {
		checkDate.setDate(checkDate.getDate() - 1);
	}

	let streak = 0;
	while (uniqueDays.has(toDateKey(checkDate))) {
		streak++;
		checkDate.setDate(checkDate.getDate() - 1);
	}

	return streak;
};

export const getServerSideProps = withPageAuthRequired({
	returnTo: '/',
	async getServerSideProps(ctx) {
		const session = await getSession(ctx.req, ctx.res);
		const prisma = new PrismaClient();

		const todos = await loadTodos(session.user.sub);

		const tomatoService = new TomatoService(prisma, session);
		const tomatoes = await tomatoService.findManyForUser();
		const contexts = await prisma.context.findMany({
			where: {
				authorId: {
					equals: session.user.sub
				}
			}
		});

		const streak = computeStreak(tomatoes);
		const lastFinished: number | null = (tomatoes[0] as any)?.finished ?? null;

		return {
			props: {
				contexts,
				tomatoes,
				todos,
				streak,
				lastFinished
			}
		};
	}
});

const toIdName = (contexts: Array<Context>): { [id: string]: string } => {
	const result = {};

	contexts.forEach((ctx) => {
		result[ctx.id] = ctx.description;
	});

	return result;
};

const toContextGoals = (contexts: Array<Context>): { [id: string]: number } => {
	const result = {};
	contexts.forEach((ctx) => {
		if (ctx.weeklyMinimum > 0) result[ctx.id] = ctx.weeklyMinimum;
	});
	return result;
};

const humanAgo = (epochSeconds: number): string => {
	const diffMs = Date.now() - epochSeconds * 1000;
	const mins = Math.floor(diffMs / 60000);
	if (mins < 60) return `${mins} min ago`;
	const hours = Math.floor(mins / 60);
	const rem = mins % 60;
	return rem > 0 ? `${hours}h ${rem}m ago` : `${hours}h ago`;
};

const WeeklySummary: React.FC<{ tomatoes: Array<any>; contexts: Array<Context> }> = ({
	tomatoes,
	contexts
}) => {
	const [showSummary, setShowSummary] = useState<boolean>(false);
	const [copiedConfirm, setCopiedConfirm] = useState<boolean>(false);

	const getWeekBounds = (d: Date) => {
		const date = new Date(d);
		const day = date.getDay();
		const monday = new Date(date);
		monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
		monday.setHours(0, 0, 0, 0);
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);
		sunday.setHours(23, 59, 59, 999);
		return { monday, sunday };
	};

	const now = new Date();
	const { monday: thisMonday, sunday: thisSunday } = getWeekBounds(now);
	const lastMonday = new Date(thisMonday);
	lastMonday.setDate(thisMonday.getDate() - 7);
	const lastSunday = new Date(lastMonday);
	lastSunday.setDate(lastMonday.getDate() + 6);
	lastSunday.setHours(23, 59, 59, 999);

	const thisWeekTomatoes = tomatoes.filter((t) => {
		const d = new Date(t.finished * 1000);
		return d.getDay() !== 0 && d >= thisMonday && d <= thisSunday;
	});
	const lastWeekTomatoes = tomatoes.filter((t) => {
		const d = new Date(t.finished * 1000);
		return d.getDay() !== 0 && d >= lastMonday && d <= lastSunday;
	});

	const thisWeekCount = thisWeekTomatoes.length;
	const lastWeekCount = lastWeekTomatoes.length;
	const hoursWorked = (thisWeekCount * 25 / 60).toFixed(1);
	const wowDelta = thisWeekCount - lastWeekCount;

	const dayCounts: { [day: number]: number } = {};
	thisWeekTomatoes.forEach((t) => {
		const d = new Date(t.finished * 1000).getDay();
		dayCounts[d] = (dayCounts[d] || 0) + 1;
	});
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	let bestDay = '—';
	let bestDayCount = 0;
	Object.entries(dayCounts).forEach(([day, count]) => {
		if (count > bestDayCount) { bestDayCount = count; bestDay = dayNames[Number(day)]; }
	});

	const contextGoalMap: { [id: string]: number } = {};
	contexts.forEach((ctx) => { if (ctx.weeklyMinimum > 0) contextGoalMap[ctx.id] = ctx.weeklyMinimum; });
	const goalEntries = Object.entries(contextGoalMap);
	const weekContextCounts: { [id: string]: number } = {};
	thisWeekTomatoes.forEach((t) => {
		if (t.contextId) weekContextCounts[t.contextId] = (weekContextCounts[t.contextId] || 0) + 1;
	});
	const goalsMet = goalEntries.filter(([id, goal]) => (weekContextCounts[id] || 0) >= goal).length;
	const goalsTotal = goalEntries.length;

	const weekStart = thisMonday.toLocaleDateString('en-us', { month: 'short', day: 'numeric' });
	const weekEnd = thisSunday.toLocaleDateString('en-us', { month: 'short', day: 'numeric' });

	const copyProgress = () => {
		const lines = [
			`ElPomodoro — Week of ${weekStart}–${weekEnd}:`,
			`🍅 ${thisWeekCount}/90 sessions (${Math.round(thisWeekCount / 90 * 100)}%)`,
		];
		goalEntries.forEach(([id, goal]) => {
			const ctx = contexts.find((c) => c.id === id);
			const count = weekContextCounts[id] || 0;
			const icon = count >= goal ? '✅' : '⚠️';
			lines.push(`${icon} ${ctx?.description ?? id}: ${count}/${goal}`);
		});
		lines.push(`⏱️ ~${hoursWorked} hrs focused`);
		navigator.clipboard.writeText(lines.join('\n'));
		setCopiedConfirm(true);
		setTimeout(() => setCopiedConfirm(false), 1500);
	};

	return (
		<div className="mb-2">
			<button
				className="btn btn-link p-0 text-decoration-none"
				onClick={() => setShowSummary((v) => !v)}
			>
				This Week {showSummary ? '▴' : '▾'}
			</button>
			{showSummary && (
				<div className="card mt-1">
					<div className="card-body py-2 px-3">
						<p className="mb-1" style={{ fontSize: '0.9rem' }}>
							{thisWeekCount} sessions · ~{hoursWorked} hrs focused
							{bestDay !== '—' && ` · Best day: ${bestDay}`}
							{goalsTotal > 0 && ` · ${goalsMet}/${goalsTotal} goals met`}
							{lastWeekCount > 0 && ` · ${wowDelta >= 0 ? '+' : ''}${wowDelta} vs last week`}
						</p>
						<button
							className="btn btn-outline-secondary btn-sm"
							onClick={copyProgress}
						>
							{copiedConfirm ? 'Copied!' : <><FontAwesomeIcon icon={faShareFromSquare} className="me-1" />Share Progress</>}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

const getTimerRunning = (): boolean => {
	try {
		const val = Cookies.get('elPomodoroTimer');
		if (!val) return false;
		const state = JSON.parse(val);
		return !!state.started && state.mode === 'Work';
	} catch {
		return false;
	}
};

const StreakBar: React.FC<{ streak: number; lastFinished: number | null }> = ({
	streak,
	lastFinished
}) => {
	const [timeAgo, setTimeAgo] = useState<string | null>(
		lastFinished ? humanAgo(lastFinished) : null
	);
	const [isStale, setIsStale] = useState<boolean>(
		lastFinished ? Date.now() - lastFinished * 1000 > 90 * 60 * 1000 : false
	);
	const [sessionInProgress, setSessionInProgress] = useState<boolean>(getTimerRunning);

	useEffect(() => {
		if (!lastFinished) return;
		const update = () => {
			setTimeAgo(humanAgo(lastFinished));
			setIsStale(Date.now() - lastFinished * 1000 > 90 * 60 * 1000);
		};
		const id = setInterval(update, 60000);
		return () => clearInterval(id);
	}, [lastFinished]);

	useEffect(() => {
		const id = setInterval(() => setSessionInProgress(getTimerRunning()), 1000);
		return () => clearInterval(id);
	}, []);

	if (streak === 0 && !lastFinished && !sessionInProgress) return null;

	return (
		<div
			className="d-flex align-items-center justify-content-center gap-3 py-2 mb-2 text-small"
			style={{ fontSize: '0.9rem', gap: '1rem' }}
		>
			{streak > 0 && (
				<span className={streak >= 1 ? 'text-success' : 'text-secondary'}>
					🔥 {streak}-day streak
				</span>
			)}
			{streak > 0 && (lastFinished || sessionInProgress) && (
				<span style={{ color: '#6c757d' }}>|</span>
			)}
			{sessionInProgress ? (
				<span className="text-primary">🍅 Session in progress</span>
			) : (lastFinished && timeAgo && (
				<span className={isStale ? 'text-warning' : 'text-success'}>
					Last session: {timeAgo}
				</span>
			))}
		</div>
	);
};

export default function TomatoMain({ user, tomatoes, todos, contexts, streak, lastFinished }) {
	const [loadedTomatoes, setTomatoes] = useState<Array<Tomato>>(tomatoes);
	const [selectedContext, setSelectedContext] = useState<Context>(undefined);
	const [idNameContexts] = useState<IdName>(toIdName(contexts));
	const [currentLastFinished, setCurrentLastFinished] = useState<number | null>(lastFinished);
	const [timerRunning, setTimerRunning] = useState<boolean>(getTimerRunning);

	const onSave = (newTomatoes: Array<Tomato>) => {
		setTomatoes(newTomatoes);
		setCurrentLastFinished(Math.floor(Date.now() / 1000));
	};

	const todayCount = loadedTomatoes.filter((t) => {
		const d = new Date((t as any).finished * 1000);
		const now = new Date();
		return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
	}).length;

	const currentTask = (loadedTomatoes[0] as any)?.description ?? undefined;

	return (
		<AppContext.Provider value={{ user }}>
			<AppLayout>
				{/* ── First fold: timer ── */}
				<TomatoTimer
					onSessionChange={setTimerRunning}
					todayCount={todayCount}
					currentTask={currentTask}
				/>

				{/* ── Below fold ── */}
				<div className="content-fold">
					<div className="container py-4">
						<StreakBar streak={streak} lastFinished={currentLastFinished} />
						<div className={timerRunning ? 'focus-dim-soft' : ''}>
							<WeeklySummary tomatoes={loadedTomatoes} contexts={contexts} />
						</div>
						<NewRow
							field="tomato"
							onSubmit={onSave}
							selectedContext={selectedContext}
							lastTomato={loadedTomatoes[0] ?? null}
						/>
						<div className={timerRunning ? 'focus-dim-soft' : ''}>
							<ContextPicker
								contexts={contexts}
								contextSelected={setSelectedContext}
							/>
						</div>
						<div className={`row${timerRunning ? ' focus-dim' : ''}`}>
							<Todo
								todos={todos}
								contexts={idNameContexts}
								selectedContext={selectedContext}
							/>
							<Tomatoes
								tomatoes={loadedTomatoes}
								contexts={idNameContexts}
								selectedContext={selectedContext}
								reAssignedContext={onSave}
								contextGoals={toContextGoals(contexts)}
							/>
						</div>
					</div>
				</div>
			</AppLayout>
		</AppContext.Provider>
	);
}
