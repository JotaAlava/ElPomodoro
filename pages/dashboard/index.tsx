import React from 'react';
import AppLayout from '../../components/AppLayout';
import { AppContext } from '../../components/AppContext';
import { Context, PrismaClient } from '@prisma/client';
import TomatoService from '../../services/tomatoService';
import { getSession, withPageAuthRequired } from '@auth0/nextjs-auth0';
import {
	AreaChart,
	Area,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareFromSquare } from '@fortawesome/free-regular-svg-icons';

// ── Colour palette ─────────────────────────────────────────────────────────

const C = {
	bg: '#1a1610',
	card: 'rgba(255,249,236,0.04)',
	border: 'rgba(255,249,236,0.08)',
	text: '#fff9ec',
	muted: '#b3aa99',
	dim: '#4d4637',
	teal: '#00cea8',
	green: '#009574',
	yellow: '#f1c40f',
	red: '#da2048',
};

// ── Data helpers ───────────────────────────────────────────────────────────

const toDateKey = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
		d.getDate()
	).padStart(2, '0')}`;

const getMondayOfWeek = (d: Date): Date => {
	const date = new Date(d);
	const day = date.getDay();
	date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
	date.setHours(0, 0, 0, 0);
	return date;
};

/** Past `n` days, each with { label, sessions, minutes } */
const buildDailyData = (tomatoes: any[], days = 30) => {
	const map = new Map<string, number>();
	const today = new Date();
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(today.getDate() - i);
		map.set(toDateKey(d), 0);
	}
	tomatoes.forEach((t) => {
		const key = toDateKey(new Date(t.finished * 1000));
		if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
	});
	return Array.from(map.entries()).map(([date, count]) => ({
		label: date.slice(5), // MM-DD
		sessions: count,
		minutes: count * 25,
	}));
};

/** Current week Mon–Sun with { day, sessions, minutes } */
const buildWeekData = (tomatoes: any[]) => {
	const monday = getMondayOfWeek(new Date());
	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	return DAYS.map((name, i) => {
		const d = new Date(monday);
		d.setDate(monday.getDate() + i);
		const key = toDateKey(d);
		const count = tomatoes.filter(
			(t) => toDateKey(new Date(t.finished * 1000)) === key
		).length;
		return { day: name, sessions: count, minutes: count * 25 };
	});
};

/** Past 8 complete weeks */
const buildWeeklyTrends = (
	tomatoes: any[]
): Array<{ label: string; count: number; mondayTs: number }> => {
	const weekMap = new Map<
		number,
		{ label: string; count: number; mondayTs: number }
	>();
	tomatoes.forEach((t) => {
		const d = new Date(t.finished * 1000);
		const monday = getMondayOfWeek(d);
		const key = monday.getTime();
		if (!weekMap.has(key)) {
			const sunday = new Date(monday);
			sunday.setDate(monday.getDate() + 6);
			const fmt = (dt: Date) =>
				dt.toLocaleDateString('en-us', { month: 'short', day: 'numeric' });
			weekMap.set(key, {
				label: `${fmt(monday)}–${fmt(sunday)}`,
				count: 0,
				mondayTs: key,
			});
		}
		weekMap.get(key).count++;
	});
	return Array.from(weekMap.values())
		.sort((a, b) => b.mondayTs - a.mondayTs)
		.slice(0, 8)
		.reverse();
};

/** Context usage this week, sorted desc */
const buildContextData = (tomatoes: any[], contexts: Context[]) => {
	const monday = getMondayOfWeek(new Date());
	const counts: { [id: string]: number } = {};
	tomatoes
		.filter((t) => new Date(t.finished * 1000) >= monday)
		.forEach((t) => {
			if (t.contextId) counts[t.contextId] = (counts[t.contextId] || 0) + 1;
		});
	return Object.entries(counts)
		.map(([id, count]) => ({
			name: contexts.find((c) => c.id === id)?.description ?? id,
			count,
		}))
		.sort((a, b) => b.count - a.count);
};

// ── Tooltip styles ─────────────────────────────────────────────────────────

const tooltipStyle = {
	contentStyle: {
		background: '#1a1610',
		border: `1px solid ${C.border}`,
		borderRadius: 8,
		color: C.text,
		fontSize: '0.8rem',
	},
	itemStyle: { color: C.teal },
	cursor: { fill: 'rgba(255,249,236,0.04)' },
};

// ── Shared axis tick props ─────────────────────────────────────────────────

const axisTick = { fill: C.dim, fontSize: 10 };
const axisProps = { axisLine: false as const, tickLine: false as const };

// ── Card wrapper ───────────────────────────────────────────────────────────

const Card: React.FC<{
	title: string;
	subtitle?: string;
	children: React.ReactNode;
	className?: string;
}> = ({ title, subtitle, children, className = '' }) => (
	<div
		className={`p-3 ${className}`}
		style={{
			background: C.card,
			border: `1px solid ${C.border}`,
			borderRadius: 12,
		}}
	>
		<h6 style={{ color: C.text, fontWeight: 600, marginBottom: subtitle ? '0.2rem' : '1rem' }}>
			{title}
		</h6>
		{subtitle && (
			<p style={{ color: C.muted, fontSize: '0.78rem', marginBottom: '1rem' }}>
				{subtitle}
			</p>
		)}
		{children}
	</div>
);

// ── getServerSideProps ─────────────────────────────────────────────────────

export const getServerSideProps = withPageAuthRequired({
	returnTo: '/',
	async getServerSideProps(ctx) {
		const session = await getSession(ctx.req, ctx.res);
		const prisma = new PrismaClient();
		const tomatoService = new TomatoService(prisma, session);
		const tomatoes = await tomatoService.findManyForUser();
		const contexts = await prisma.context.findMany({
			where: { authorId: { equals: session.user.sub } },
		});
		return { props: { tomatoes, contexts } };
	},
});

// ── Dashboard page ─────────────────────────────────────────────────────────

export default function Dashboard({ user, tomatoes, contexts }) {
	const WORK_GOAL = 90;

	// Derived data
	const dailyData = buildDailyData(tomatoes, 30);
	const weekData = buildWeekData(tomatoes);
	const weeklyTrends = buildWeeklyTrends(tomatoes);
	const contextData = buildContextData(tomatoes, contexts);

	// This-week stats (for hero)
	const monday = getMondayOfWeek(new Date());
	const thisWeekTomatoes = tomatoes.filter(
		(t) => new Date(t.finished * 1000) >= monday
	);
	const thisWeekCount = thisWeekTomatoes.length;
	const hoursWorked = ((thisWeekCount * 25) / 60).toFixed(1);

	// Last-week for delta
	const lastMonday = new Date(monday);
	lastMonday.setDate(monday.getDate() - 7);
	const lastWeekCount = tomatoes.filter((t) => {
		const d = new Date(t.finished * 1000);
		return d >= lastMonday && d < monday;
	}).length;
	const wowDelta = thisWeekCount - lastWeekCount;

	// Goals
	const contextGoalMap: { [id: string]: number } = {};
	contexts.forEach((ctx) => {
		if (ctx.weeklyMinimum > 0) contextGoalMap[ctx.id] = ctx.weeklyMinimum;
	});
	const weekContextCounts: { [id: string]: number } = {};
	thisWeekTomatoes.forEach((t) => {
		if (t.contextId)
			weekContextCounts[t.contextId] =
				(weekContextCounts[t.contextId] || 0) + 1;
	});
	const goalEntries = Object.entries(contextGoalMap);
	const goalsMet = goalEntries.filter(
		([id, goal]) => (weekContextCounts[id] || 0) >= goal
	).length;

	// Share text
	const [copiedConfirm, setCopiedConfirm] = React.useState(false);
	const weekStart = monday.toLocaleDateString('en-us', {
		month: 'short',
		day: 'numeric',
	});
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	const weekEnd = sunday.toLocaleDateString('en-us', {
		month: 'short',
		day: 'numeric',
	});

	const copyProgress = () => {
		const lines = [
			`ElPomodoro — Week of ${weekStart}–${weekEnd}:`,
			`🍅 ${thisWeekCount}/${WORK_GOAL} sessions (${Math.round(
				(thisWeekCount / WORK_GOAL) * 100
			)}%)`,
		];
		goalEntries.forEach(([id, goal]) => {
			const ctx = contexts.find((c) => c.id === id);
			const count = weekContextCounts[id] || 0;
			lines.push(`${count >= goal ? '✅' : '⚠️'} ${ctx?.description ?? id}: ${count}/${goal}`);
		});
		lines.push(`⏱️ ~${hoursWorked} hrs focused`);
		navigator.clipboard.writeText(lines.join('\n'));
		setCopiedConfirm(true);
		setTimeout(() => setCopiedConfirm(false), 1500);
	};

	// Bar colour for weekly trends
	const trendBarColor = (count: number) =>
		count >= WORK_GOAL ? C.teal : count >= 45 ? C.yellow : C.red;

	return (
		<AppContext.Provider value={{ user }}>
			<AppLayout>
				<div
					style={{
						background: C.bg,
						minHeight: '100vh',
						padding: '2.5rem 2rem 4rem',
						color: C.text,
					}}
				>
					{/* ── Hero ─────────────────────────────────────────────────── */}
					<div className="d-flex align-items-start justify-content-between mb-1">
						<div>
							<p
								style={{
									color: C.muted,
									fontSize: '0.7rem',
									letterSpacing: '0.15em',
									textTransform: 'uppercase',
									marginBottom: '0.4rem',
								}}
							>
								Dashboard
							</p>
							<h1
								style={{
									fontSize: 'clamp(2rem, 5vw, 3rem)',
									fontWeight: 700,
									lineHeight: 1,
									marginBottom: '0.4rem',
								}}
							>
								<span style={{ color: C.teal }}>{thisWeekCount}</span>
								<span style={{ color: C.text, fontWeight: 300 }}>
									{' '}
									sessions
								</span>
							</h1>
							<p style={{ color: C.muted, fontSize: '0.88rem', marginBottom: 0 }}>
								~{hoursWorked} hrs focused this week
								{lastWeekCount > 0 && (
									<span
										style={{
											marginLeft: '0.75rem',
											color: wowDelta >= 0 ? C.teal : C.red,
										}}
									>
										{wowDelta >= 0 ? '+' : ''}
										{wowDelta} vs last week
									</span>
								)}
								{goalEntries.length > 0 && (
									<span style={{ marginLeft: '0.75rem', color: C.muted }}>
										·{' '}
										<span
											style={{
												color: goalsMet === goalEntries.length ? C.teal : C.yellow,
											}}
										>
											{goalsMet}/{goalEntries.length} goals
										</span>
									</span>
								)}
							</p>
						</div>
						<button
							className="btn btn-sm mt-1"
							onClick={copyProgress}
							style={{
								background: 'transparent',
								border: `1px solid ${C.border}`,
								color: C.muted,
								borderRadius: 8,
								fontSize: '0.8rem',
							}}
						>
							{copiedConfirm ? (
								'Copied!'
							) : (
								<>
									<FontAwesomeIcon icon={faShareFromSquare} className="me-1" />
									Share
								</>
							)}
						</button>
					</div>

					{/* ── Daily Overview chart ──────────────────────────────────── */}
					<Card title="Daily Overview" subtitle="Sessions per day — past 30 days" className="mb-3 mt-3">
						<ResponsiveContainer width="100%" height={130}>
							<AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
								<defs>
									<linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor={C.teal} stopOpacity={0.35} />
										<stop offset="95%" stopColor={C.teal} stopOpacity={0} />
									</linearGradient>
								</defs>
								<XAxis
									dataKey="label"
									tick={axisTick}
									{...axisProps}
									interval={4}
								/>
								<YAxis tick={axisTick} {...axisProps} allowDecimals={false} />
								<Tooltip
									{...tooltipStyle}
									formatter={(v: number) => [`${v} sessions`, 'Focus']}
								/>
								<Area
									type="monotone"
									dataKey="sessions"
									stroke={C.teal}
									strokeWidth={2}
									fill="url(#tealGrad)"
									dot={false}
									activeDot={{ r: 4, fill: C.teal }}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</Card>

					{/* ── 2×2 grid ─────────────────────────────────────────────── */}
					<div className="row g-3">
						{/* Focus Time */}
						<div className="col-md-6">
							<Card
								title="Focus Time"
								subtitle="Minutes focused per day — this week"
								className="h-100"
							>
								<ResponsiveContainer width="100%" height={180}>
									<BarChart
										data={weekData}
										margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
									>
										<XAxis dataKey="day" tick={axisTick} {...axisProps} />
										<YAxis tick={axisTick} {...axisProps} allowDecimals={false} />
										<Tooltip
											{...tooltipStyle}
											formatter={(v: number) => [`${v} min`, 'Focus']}
										/>
										<Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
											{weekData.map((entry, i) => (
												<Cell
													key={i}
													fill={entry.minutes >= 25 ? C.green : C.dim}
												/>
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</Card>
						</div>

						{/* Weekly Progress (former Focus Trends) */}
						<div className="col-md-6">
							<Card
								title="Weekly Progress"
								subtitle={`Sessions vs ${WORK_GOAL}-session goal — past 8 weeks`}
								className="h-100"
							>
								{weeklyTrends.length === 0 ? (
									<div
										className="text-center py-4"
										style={{ color: C.muted, fontSize: '0.85rem' }}
									>
										No data yet
									</div>
								) : (
									<ResponsiveContainer width="100%" height={180}>
										<BarChart
											data={weeklyTrends}
											margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
										>
											<XAxis
												dataKey="label"
												tick={{ ...axisTick, fontSize: 9 }}
												{...axisProps}
												interval={0}
												angle={-20}
												textAnchor="end"
												height={36}
											/>
											<YAxis
												tick={axisTick}
												{...axisProps}
												allowDecimals={false}
												domain={[0, Math.max(WORK_GOAL, ...weeklyTrends.map((w) => w.count))]}
											/>
											<Tooltip
												{...tooltipStyle}
												formatter={(v: number) => [
													`${v}/${WORK_GOAL}`,
													'Sessions',
												]}
											/>
											<Bar dataKey="count" radius={[4, 4, 0, 0]}>
												{weeklyTrends.map((entry, i) => (
													<Cell key={i} fill={trendBarColor(entry.count)} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								)}
							</Card>
						</div>

						{/* Session count */}
						<div className="col-md-6">
							<Card
								title="Sessions"
								subtitle="Focus session count per day — this week"
								className="h-100"
							>
								<ResponsiveContainer width="100%" height={180}>
									<BarChart
										data={weekData}
										margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
									>
										<XAxis dataKey="day" tick={axisTick} {...axisProps} />
										<YAxis
											tick={axisTick}
											{...axisProps}
											allowDecimals={false}
										/>
										<Tooltip
											{...tooltipStyle}
											formatter={(v: number) => [v, 'Sessions']}
										/>
										<Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
											{weekData.map((entry, i) => (
												<Cell
													key={i}
													fill={entry.sessions > 0 ? C.teal : C.dim}
												/>
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</Card>
						</div>

						{/* Context breakdown */}
						<div className="col-md-6">
							<Card
								title="Context Breakdown"
								subtitle="Most focused areas — this week"
								className="h-100"
							>
								{contextData.length === 0 ? (
									<div
										className="text-center py-5"
										style={{ color: C.muted }}
									>
										<p style={{ marginBottom: '0.4rem' }}>No Data</p>
										<p style={{ fontSize: '0.8rem', margin: 0 }}>
											Start a session to see context usage
										</p>
									</div>
								) : (
									<div style={{ paddingTop: '0.5rem' }}>
										{contextData.map((c, i) => {
											const pct =
												(c.count / (contextData[0]?.count || 1)) * 100;
											return (
												<div key={i} className="mb-3">
													<div
														className="d-flex justify-content-between"
														style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}
													>
														<span style={{ color: C.text }}>{c.name}</span>
														<span style={{ color: C.muted }}>
															{c.count}{' '}
															{c.count === 1 ? 'session' : 'sessions'}
														</span>
													</div>
													<div
														style={{
															height: 6,
															background: C.border,
															borderRadius: 3,
															overflow: 'hidden',
														}}
													>
														<div
															style={{
																height: '100%',
																width: `${pct}%`,
																background: i === 0 ? C.teal : C.green,
																borderRadius: 3,
																transition: 'width 0.4s ease',
															}}
														/>
													</div>
												</div>
											);
										})}

										{/* Goal progress if any */}
										{goalEntries.length > 0 && (
											<div
												style={{
													borderTop: `1px solid ${C.border}`,
													paddingTop: '0.75rem',
													marginTop: '0.5rem',
												}}
											>
												<p
													style={{
														color: C.muted,
														fontSize: '0.7rem',
														letterSpacing: '0.1em',
														textTransform: 'uppercase',
														marginBottom: '0.5rem',
													}}
												>
													Goals
												</p>
												{goalEntries.map(([id, goal], i) => {
													const ctx = contexts.find((c) => c.id === id);
													const count = weekContextCounts[id] || 0;
													const met = count >= goal;
													return (
														<div
															key={i}
															className="d-flex justify-content-between align-items-center mb-1"
															style={{ fontSize: '0.82rem' }}
														>
															<span style={{ color: C.text }}>
																{ctx?.description ?? id}
															</span>
															<span
																style={{ color: met ? C.teal : C.yellow }}
															>
																{count}/{goal}{' '}
																{met ? '✓' : ''}
															</span>
														</div>
													);
												})}
											</div>
										)}
									</div>
								)}
							</Card>
						</div>
					</div>
				</div>
			</AppLayout>
		</AppContext.Provider>
	);
}
