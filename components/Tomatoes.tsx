import React, { useEffect, useState } from 'react';
import { Context, Tomato } from '@prisma/client';
import { faObjectUngroup } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IdName } from './Todos';

export interface TomatoesProps {
	tomatoes: Array<Tomato>;
	contexts: IdName;
	selectedContext: Context;
	reAssignedContext: (tomatoes: Array<Tomato>) => void;
}

interface GroupedTomato {
	day: string;
	count: number;
	weekCount: number;
	contextCount: { [contextId: string]: number };
	tomatoes: Array<Tomato>;
}

const Tomatoes: React.FC<TomatoesProps> = ({
	tomatoes,
	contexts,
	selectedContext,
	reAssignedContext
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

			result.forEach((res2) => {
				const thisDay = new Date(res2.day);

				if (
					thisDay.getDay() !== 0 &&
					thisDay >= boundaries.start &&
					thisDay <= boundaries.end
				) {
					weekCount = weekCount + res2.count;
				}
			});

			res.weekCount = weekCount;
		});

		return result;
	};

	const [groupedTomatoes, setGroupedTomatoes] = useState<Array<GroupedTomato>>(
		sort(tomatoes)
	);

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

	const workGoal = 90;
	return (
		<div className="col-sm">
			<h3>Tomatoes</h3>
			{groupedTomatoes.length > 0 ? (
				<div id="list-example" className="list-group">
					{groupedTomatoes.map((gt, idx) => {
						return (
							<div className="card" key={idx}>
								<div className="card-body">
									<h5 className="card-title">{gt.day}</h5>
									<h6 className="card-subtitle mb-2 text-muted">
										<span>
											Week:{' '}
											<span
												className={
													gt.weekCount < workGoal
														? 'text-warning'
														: 'text-success'
												}
											>
												{gt.weekCount}/{workGoal}
											</span>
										</span>
										<span> Day: {gt.count} </span>
										{Object.keys(gt.contextCount).map((key, idx2) => {
											return (
												<span key={idx2} className="badge bg-secondary ms-1">
													{contexts[key]} : {gt.contextCount[key]}
												</span>
											);
										})}
									</h6>
									<div className="card-text">
										{gt.tomatoes.map((tomato, idx2) => {
											return (
												<div
													className="list-group-item d-flex flex-wrap"
													key={idx2}
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
														<div>
															{selectedContext ? (
																<FontAwesomeIcon
																	className="m-1"
																	icon={faObjectUngroup}
																	role="button"
																	onClick={() => {
																		reAssignContext({
																			...tomato,
																			contextId: selectedContext.id
																		});
																	}}
																/>
															) : null}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<p className="mt-3 text-center">No tomatoes</p>
			)}
		</div>
	);
};

export default Tomatoes;
