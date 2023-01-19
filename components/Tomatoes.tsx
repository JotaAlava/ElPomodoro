import React, { useEffect, useState } from 'react';
import { Context, Tomato } from '@prisma/client';
import { faObjectUngroup } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export interface TomatoesProps {
	tomatoes: Array<Tomato>;
	contexts: { [id: string]: string };
	selectedContext: Context;
	reAssignedContext: (tomatoes: Array<Tomato>) => void;
}

interface GroupedTomato {
	day: string;
	count: number;
	contextCount: { [contextId: string]: number };
	tomatoes: Array<Tomato>;
}

const Tomatoes: React.FC<TomatoesProps> = ({
	tomatoes,
	contexts,
	selectedContext,
	reAssignedContext
}) => {
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

	return (
		<div className="col-sm">
			<h3>Tomatoes</h3>
			<div id="list-example" className="list-group">
				{groupedTomatoes.map((gt, idx) => {
					return (
						<div className="card" key={idx}>
							<div className="card-body">
								<h5 className="card-title">{gt.day}</h5>
								<h6 className="card-subtitle mb-2 text-muted">
									{gt.count}
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
												className="list-group-item d-flex justify-content-between"
												key={idx2}
											>
												<span className="d-flex align-items-center w-50">
													{tomato.description}
												</span>
												<span className="badge bg-secondary ms-1 h-100">
													{contexts[tomato.contextId]}
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
										);
									})}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default Tomatoes;
