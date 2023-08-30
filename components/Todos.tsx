import React, { useState } from 'react';
import NewRow from './NewRow';
import { Context, Todo } from '@prisma/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faObjectUngroup } from '@fortawesome/free-regular-svg-icons';

export interface IdName {
	[id: string]: string;
}

export interface TodoProps {
	todos: Array<Todo>;
	contexts: IdName;
	selectedContext: Context;
}

const Todo: React.FC<TodoProps> = (props) => {
	const [showAll, setShowAll] = useState(false);
	const [loadedTodos, setLoadedTodos] = useState<Array<Todo>>(props.todos);
	const [editDueDate, setEditDueDate] = useState<IdName>({});

	const onSave = (newTodos: Array<Todo>) => {
		setLoadedTodos(newTodos);
	};

	const complete = async (todo: Todo) => {
		const response = await fetch(`/api/todo`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				id: todo.id
			})
		});

		const result = await response.json();
		setLoadedTodos(result);
	};

	const updateTodo = async (todo: Todo) => {
		const response = await fetch(`/api/todo`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(todo)
		});

		const result = await response.json();
		setLoadedTodos(result);
	};

	const isInFuture = (dueDate: Date) => {
		return dueDate.getTime() > new Date().getTime();
	};

	const filterBySelectedContext = (todo) => {
		if (props?.selectedContext?.id) {
			return todo.contextId === props.selectedContext.id;
		} else {
			return true;
		}
	};

	const filterByOthers = (todo) => {
		if (props?.selectedContext?.id) {
			return todo.contextId !== props.selectedContext.id;
		} else {
			return false;
		}
	};

	return (
		<div className="col-sm">
			<h3>TODOs</h3>
			<NewRow field="todo" onSubmit={onSave}></NewRow>
			<>
				<div id="list-example" className="list-group">
					{loadedTodos.filter(filterBySelectedContext).length === 0 && (
						<p className="mt-3 text-center">All done!</p>
					)}
					{loadedTodos.filter(filterBySelectedContext).map((todo, idx) => {
						return (
							<div className="card" key={idx}>
								<div className="card-body">
									<div className="card-text">
										<div className="d-flex flex-wrap" key={idx}>
											<div className="d-flex justify-content-between w-100 mb-2">
												{todo.dueDate && (
													<span className="d-flex align-items-center">
														<strong
															className={
																isInFuture(new Date(todo.dueDate))
																	? 'text-success'
																	: 'text-warning'
															}
														>
															Due On: {todo.dueDate}
														</strong>
													</span>
												)}
												<span className="badge bg-secondary ms-1 h-100">
													{props.contexts[todo.contextId]}
												</span>
											</div>
											<div className="d-flex justify-content-between w-100">
												<span
													className="d-flex align-items-center w-95 list-group-item list-group-item-action"
													role="button"
													onClick={() => {
														complete(todo);
													}}
												>
													{todo.description}
												</span>
												<div className="todo-context">
													{editDueDate[todo.id] ? (
														<>
															<label>Due On:</label>
															<input
																id="startDate"
																className="form-control"
																type="date"
																onChange={(val) => {
																	updateTodo({
																		...todo,
																		dueDate: val.target.value
																	});

																	const newState = {};
																	newState[todo.id] = false;

																	const updated = {
																		...editDueDate,
																		...newState
																	};

																	setEditDueDate(updated);
																}}
															/>
															<button
																className="btn btn-warning cancel-due-date"
																onClick={() => {
																	const newState = {};
																	newState[todo.id] = false;

																	const updated = {
																		...editDueDate,
																		...newState
																	};

																	setEditDueDate(updated);
																}}
															>
																Cancel
															</button>
														</>
													) : (
														<span
															className="ms-3"
															role="button"
															onClick={() => {
																const newState = {};
																newState[todo.id] = true;

																const updated = {
																	...editDueDate,
																	...newState
																};

																setEditDueDate(updated);
															}}
														>
															Due Date
														</span>
													)}

													{props.selectedContext && !editDueDate[todo.id] ? (
														<FontAwesomeIcon
															className="m-1"
															icon={faObjectUngroup}
															role="button"
															onClick={() => {
																updateTodo({
																	...todo,
																	contextId: props.selectedContext.id
																});
															}}
														/>
													) : null}
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
				<button
					className="btn btn-warning mb-4 mt-4"
					style={{ width: '100%' }}
					onClick={() => {
						setShowAll(!showAll);
					}}
				>
					Show All
				</button>
				{showAll && (
					<div className="list-group" style={{ opacity: '0.75' }}>
						{loadedTodos.filter(filterByOthers).length === 0 && (
							<p className="mt-3 text-center">All done!</p>
						)}
						{loadedTodos
							.filter(filterByOthers)
							.sort((a, b) => {
								const contextIdA = a.contextId;
								const contextIdB = b.contextId;

								if (contextIdA === null) {
									return 1; // Place null at the bottom
								}
								if (contextIdB === null) {
									return -1; // Place null at the bottom
								}

								if (a.contextId > b.contextId) {
									return 1;
								} else if (a.contextId < b.contextId) {
									return -1;
								} else {
									return 0;
								}
							})
							.map((todo, idx) => {
								return (
									<div className="card" key={idx}>
										<div className="card-body">
											<div className="card-text">
												<div className="d-flex flex-wrap" key={idx}>
													<div className="d-flex justify-content-between w-100 mb-2">
														<span className="badge bg-secondary ms-1 h-100">
															{props.contexts[todo.contextId]}
														</span>
													</div>
													<div className="d-flex justify-content-between w-100">
														<span
															className="d-flex align-items-center w-95 list-group-item list-group-item-action"
															role="button"
															onClick={() => {
																updateTodo({
																	...todo,
																	contextId: props.selectedContext.id
																});
															}}
														>
															{todo.description}
														</span>
													</div>
												</div>
											</div>
										</div>
									</div>
								);
							})}
					</div>
				)}
			</>
		</div>
	);
};

export default Todo;
