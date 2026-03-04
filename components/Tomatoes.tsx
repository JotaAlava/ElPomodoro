import React, { useEffect, useRef, useState } from 'react';
import { Context, Tomato } from '@prisma/client';
import { IdName } from './Todos';

export interface TomatoesProps {
	tomatoes: Array<Tomato>;
	contexts: IdName;
	selectedContext: Context;
	reAssignedContext: (tomatoes: Array<Tomato>) => void;
	contextGoals: { [id: string]: number };
}

interface GroupedTomato {
	day: string;
	count: number;
	weekCount: number;
	weekContextCount: { [contextId: string]: number };
	contextCount: { [contextId: string]: number };
	tomatoes: Array<Tomato>;
}

interface ContextMenu {
	tomato: Tomato;
	x: number;
	y: number;
}

const Tomatoes: React.FC<TomatoesProps> = ({
	tomatoes,
	contexts,
	selectedContext,
	reAssignedContext,
	contextGoals
}) => {
	// First day of the week is Sunday. Last is Saturday
	const getWeekBoundaries = (dayOfWeek) => {
		const dateOfWeek = new Date(dayOfWeek);
		const startDate = new Date(
			dateOfWeek.setDate(dateOfWeek.getDate() - dateOfWeek.getDay())
		);
		const endDate = new Date(
			dateOfWeek.setDate(dateOfWeek.getDate() - dateOfWeek.getDay() + 6)
		);

		return {
			start: startDate,
			end: endDate
		};
	};

	const getHash = (tomato: Tomato): string => {
		const hash = `${tomato.finished.getDate()}${
			tomato.finished.getMonth() + 1
		}${tomato.finished.getFullYear()}`;

		return hash;
	};

	const sort = (tomatoes: Array<Tomato>): Array<GroupedTomato> => {
		const initialSort = tomatoes
			.sort((a, b) => {
				if (b.finished > a.finished) {
					return 1;
				} else if (b.finished < a.finished) {
					return -1;
				} else {
					return 0;
				}
			})
			.map((mapped) => {
				return {
					...mapped,
					finished: new Date((mapped.finished as any) * 1000)
				};
			});

		const result = [];
		let onGoing: GroupedTomato;
		let contextCount: { [contextId: string]: number };
		let hash;
		initialSort.forEach((sortedTomato) => {
			// If the hash has changed, we are looking at a different day
			const newHash = getHash(sortedTomato);
			if (hash === newHash) {
				onGoing.count++;
				onGoing.tomatoes.push(sortedTomato);

				if (sortedTomato.contextId) {
					if (onGoing.contextCount[sortedTomato.contextId] === undefined) {
						onGoing.contextCount[sortedTomato.contextId] = 1;
					} else {
						onGoing.contextCount[sortedTomato.contextId] =
							onGoing.contextCount[sortedTomato.contextId] + 1;
					}
				}
			} else {
				if (hash !== undefined) {
					// Push into list before we update it
					result.push(onGoing);
				}

				hash = newHash;
				contextCount = {};

				onGoing = {
					count: 1,
					weekCount: 0,
					weekContextCount: {},
					day: sortedTomato.finished.toLocaleDateString('en-us', {
						weekday: 'long',
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					}),
					contextCount,
					tomatoes: [sortedTomato]
				};

				if (sortedTomato.contextId) {
					if (onGoing.contextCount[sortedTomato.contextId] === undefined) {
						onGoing.contextCount[sortedTomato.contextId] = 1;
					} else {
						onGoing.contextCount[sortedTomato.contextId] =
							onGoing.contextCount[sortedTomato.contextId] + 1;
					}
				}
			}
		});

		if (onGoing) {
			// Push the last one in as well...
			result.push(onGoing);
		}

		// Compute the weekly total per row
		result.forEach((res) => {
			const boundaries = getWeekBoundaries(res.day);
			let weekCount = 0;
			const weekContextCount: { [contextId: string]: number } = {};

			result.forEach((res2) => {
				const thisDay = new Date(res2.day);

				if (
					thisDay.getDay() !== 0 &&
					thisDay >= boundaries.start &&
					thisDay <= boundaries.end
				) {
					weekCount = weekCount + res2.count;
					Object.keys(res2.contextCount).forEach(ctxId => {
						weekContextCount[ctxId] = (weekContextCount[ctxId] || 0) + res2.contextCount[ctxId];
					});
				}
			});

			res.weekCount = weekCount;
			res.weekContextCount = weekContextCount;
		});

		return result;
	};

	const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

	const computeMilestoneMap = (grouped: Array<GroupedTomato>): Map<number, number> => {
		const result = new Map<number, number>();
		const oldestFirst = [...grouped].reverse();
		let cumulative = 0;
		let nextMilestoneIdx = 0;
		oldestFirst.forEach((g, oldestIdx) => {
			const prevCumulative = cumulative;
			cumulative += g.count;
			while (nextMilestoneIdx < MILESTONES.length && cumulative >= MILESTONES[nextMilestoneIdx]) {
				const newestFirstIdx = grouped.length - 1 - oldestIdx;
				result.set(newestFirstIdx, MILESTONES[nextMilestoneIdx]);
				nextMilestoneIdx++;
			}
		});
		return result;
	};

	const getMondayOfWeek = (date: Date): Date => {
		const d = new Date(date);
		const day = d.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		d.setDate(d.getDate() + diff);
		d.setHours(0, 0, 0, 0);
		return d;
	};

	const computeWeeklyTrends = (tomatoList: Array<Tomato>): Array<{ label: string; count: number; mondayTs: number }> => {
		const weekMap = new Map<number, { label: string; count: number; mondayTs: number }>();
		tomatoList.forEach((t) => {
			const d = new Date((t.finished as any) * 1000);
			const monday = getMondayOfWeek(d);
			const key = monday.getTime();
			if (!weekMap.has(key)) {
				const sunday = new Date(monday);
				sunday.setDate(monday.getDate() + 6);
				const fmt = (dt: Date) => dt.toLocaleDateString('en-us', { month: 'short', day: 'numeric' });
				weekMap.set(key, { label: `${fmt(monday)}–${fmt(sunday)}`, count: 0, mondayTs: key });
			}
			weekMap.get(key).count++;
		});
		return Array.from(weekMap.values())
			.sort((a, b) => b.mondayTs - a.mondayTs)
			.slice(0, 8)
			.reverse();
	};

	const [groupedTomatoes, setGroupedTomatoes] = useState<Array<GroupedTomato>>(
		sort(tomatoes)
	);
	const [showTrends, setShowTrends] = useState<boolean>(false);
	const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const reAssignContext = async (tomato: Tomato) => {
		const response = await fetch(`/api/tomato`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(tomato)
		});

		const result = await response.json();
		reAssignedContext(result);
	};

	useEffect(() => {
		setGroupedTomatoes(sort(tomatoes));
	}, tomatoes);

	useEffect(() => {
		const close = () => setContextMenu(null);
		document.addEventListener('click', close);
		document.addEventListener('contextmenu', close);
		return () => {
			document.removeEventListener('click', close);
			document.removeEventListener('contextmenu', close);
		};
	}, []);

	const openContextMenu = (e: React.MouseEvent, tomato: Tomato) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenu({ tomato, x: e.clientX, y: e.clientY });
	};

	const sortedContextEntries = Object.entries(contexts).sort(([, a], [, b]) =>
		a.localeCompare(b)
	);

	const workGoal = 90;
	const milestoneMap = computeMilestoneMap(groupedTomatoes);
	const weeklyTrends = computeWeeklyTrends(tomatoes);

	return (
		<div className="col-sm">
			<h3>Tomatoes</h3>

			<button
				className="btn btn-link p-0 mb-2 text-decoration-none"
				onClick={() => setShowTrends((v) => !v)}
			>
				Focus Trends {showTrends ? '▴' : '▾'}
			</button>
			{showTrends && (
				<div className="mb-3">
					{weeklyTrends.map((w, i) => {
						const pct = Math.min(100, (w.count / workGoal) * 100);
						const barClass = w.count >= workGoal ? 'bg-success' : w.count >= 45 ? 'bg-warning' : 'bg-danger';
						return (
							<div key={i} className="mb-1">
								<div className="d-flex justify-content-between" style={{ fontSize: '0.8rem' }}>
									<span>{w.label}</span>
									<span>{w.count}/{workGoal}</span>
								</div>
								<div className="progress" style={{ height: 16 }}>
									<div
										className={`progress-bar ${barClass}`}
										style={{ width: `${pct}%` }}
									/>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{groupedTomatoes.length > 0 ? (
				<div id="list-example" className="list-group">
					{groupedTomatoes.map((gt, idx) => {
						return (
							<React.Fragment key={idx}>
							{milestoneMap.has(idx) && (
								<div className="text-center my-2">
									<span className="badge bg-warning text-dark fs-6 px-3 py-2">
										🏆 {milestoneMap.get(idx)} Sessions
									</span>
								</div>
							)}
							<div className="card">
								<div className="card-body">
									<h5 className="card-title">{gt.day}</h5>
									<h6 className="card-subtitle mb-1 text-muted">
										<div>
											<span>
												Week:{' '}
												<span className={gt.weekCount < workGoal ? 'text-warning' : 'text-success'}>
													{gt.weekCount}/{workGoal}
												</span>
											</span>
											{Object.keys(contextGoals).map((ctxId, idx2) => {
												const goal = contextGoals[ctxId];
												const weekCtxCount = gt.weekContextCount[ctxId] || 0;
												return (
													<span
														key={`goal-${idx2}`}
														className={`badge ms-2 ${weekCtxCount >= goal ? 'bg-success' : 'bg-warning text-dark'}`}
													>
														{contexts[ctxId]}: {weekCtxCount}/{goal}
													</span>
												);
											})}
										</div>
										<div>
											<span>Day: {gt.count}</span>
											{Object.keys(gt.contextCount).map((key, idx2) => {
												return (
													<span key={idx2} className="badge bg-secondary ms-2">
														{contexts[key]}: {gt.contextCount[key]}
													</span>
												);
											})}
											{Object.keys(gt.contextCount).length >= 4 && (
												<span className="badge bg-warning text-dark ms-2">
													⚡ {Object.keys(gt.contextCount).length} context switches
												</span>
											)}
										</div>
									</h6>
									<div className="card-text">
										{gt.tomatoes.map((tomato, idx2) => {
											return (
												<div
													className="list-group-item d-flex flex-wrap"
													key={idx2}
													onContextMenu={(e) => openContextMenu(e, tomato)}
												>
													<div className="d-flex justify-content-between w-100">
														<span className="d-flex align-items-center w-75">
															<strong>
																{tomato.finished.toLocaleTimeString()}
															</strong>
														</span>
														<span className="badge bg-secondary ms-1 h-100">
															{contexts[tomato.contextId]}
														</span>
													</div>
													<div className="d-flex justify-content-between w-100">
														<span className="d-flex align-items-center w-95">
															{tomato.description}
														</span>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</React.Fragment>
						);
					})}
				</div>
			) : (
				<p className="mt-3 text-center">No tomatoes</p>
			)}

			{contextMenu && (
				<div
					ref={menuRef}
					className="dropdown-menu dropdown-menu-dark show shadow"
					style={{
						position: 'fixed',
						top: contextMenu.y,
						left: contextMenu.x,
						zIndex: 9999
					}}
					onClick={(e) => e.stopPropagation()}
				>
					<h6 className="dropdown-header">Assign Context</h6>
					{sortedContextEntries.map(([id, name]) => (
						<button
							key={id}
							className="dropdown-item"
							onClick={() => {
								reAssignContext({ ...contextMenu.tomato, contextId: id });
								setContextMenu(null);
							}}
						>
							{name}
						</button>
					))}
					<div className="dropdown-divider" />
					<button
						className="dropdown-item text-danger"
						onClick={() => {
							reAssignContext({ ...contextMenu.tomato, contextId: null });
							setContextMenu(null);
						}}
					>
						Unassign
					</button>
				</div>
			)}
		</div>
	);
};

export default Tomatoes;
