import React, { useEffect, useRef, useState } from 'react';
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

const FOCUS_COUNT = 3;

interface ContextMenu {
	todo: Todo;
	x: number;
	y: number;
}

const Todo: React.FC<TodoProps> = (props) => {
	const [loadedTodos, setLoadedTodos] = useState<Array<Todo>>(props.todos);
	const [editDueDate, setEditDueDate] = useState<IdName>({});
	const [focusMode, setFocusMode] = useState(true);
	const [showDeferred, setShowDeferred] = useState(false);
	const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const close = () => setContextMenu(null);
		document.addEventListener('click', close);
		document.addEventListener('contextmenu', close);
		return () => {
			document.removeEventListener('click', close);
			document.removeEventListener('contextmenu', close);
		};
	}, []);

	const openContextMenu = (e: React.MouseEvent, todo: Todo) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenu({ todo, x: e.clientX, y: e.clientY });
	};

	const sortedContextEntries = Object.entries(props.contexts).sort(([, a], [, b]) =>
		a.localeCompare(b)
	);

	const todayISO = new Date().toISOString().slice(0, 10);

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

	const deferNotToday = async (todo: Todo) => {
		await updateTodo({ ...todo, deferredDate: todayISO } as any);
	};

	const isInFuture = (dueDate: Date) => {
		return dueDate.getTime() > new Date().getTime();
	};

	const filterBySelectedContext = (todo: Todo) => {
		if (props?.selectedContext?.id) {
			return todo.contextId === props.selectedContext.id;
		} else {
			return true;
		}
	};


	const isDeferred = (todo: Todo) => (todo as any).deferredDate === todayISO;

	// Todos matching context filter, split into deferred and active
	const contextFiltered = loadedTodos.filter(filterBySelectedContext);
	const activeTodos = contextFiltered.filter((t) => !isDeferred(t));
	const deferredTodos = contextFiltered.filter(isDeferred);

	// Focus mode: first 3 active todos
	const visibleTodos = focusMode ? activeTodos.slice(0, FOCUS_COUNT) : activeTodos;
	const hiddenCount = activeTodos.length - FOCUS_COUNT;

	const renderTodoCard = (todo: Todo, idx: number, showNotToday = false) => (
		<div className="card" key={idx} onContextMenu={(e) => openContextMenu(e, todo)}>
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
							{props.contexts[todo.contextId] && (
								<span className="ms-1" style={{
									background: 'rgba(0,206,168,0.15)',
									color: '#00cea8',
									fontSize: '0.65rem',
									fontWeight: 700,
									letterSpacing: '0.08em',
									textTransform: 'uppercase',
									borderRadius: 999,
									padding: '0.15rem 0.55rem',
									whiteSpace: 'nowrap',
									display: 'inline-block',
								}}>
									{props.contexts[todo.contextId]}
								</span>
							)}
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

								{showNotToday && !editDueDate[todo.id] && (
									<span
										className="ms-2 text-muted"
										role="button"
										style={{ fontSize: '0.8rem', cursor: 'pointer' }}
										onClick={() => deferNotToday(todo)}
									>
										Not today
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<div className="col-sm">
			<h3>TODOs</h3>
			<NewRow field="todo" onSubmit={onSave}></NewRow>
			<>
				<div id="list-example" className="list-group">
					{activeTodos.length === 0 && deferredTodos.length === 0 && (
						<p className="mt-3 text-center">All done!</p>
					)}
					{visibleTodos.map((todo, idx) => renderTodoCard(todo, idx, true))}
				</div>

				{focusMode && hiddenCount > 0 && (
					<button
						className="btn btn-outline-secondary btn-sm mt-2 mb-2"
						style={{ width: '100%' }}
						onClick={() => setFocusMode(false)}
					>
						Show {hiddenCount} more task{hiddenCount !== 1 ? 's' : ''}
					</button>
				)}

				{!focusMode && activeTodos.length > FOCUS_COUNT && (
					<button
						className="btn btn-outline-secondary btn-sm mt-2 mb-2"
						style={{ width: '100%' }}
						onClick={() => setFocusMode(true)}
					>
						Show less
					</button>
				)}

				{deferredTodos.length > 0 && (
					<div className="mt-3">
						<button
							className="btn btn-outline-secondary btn-sm mb-2"
							onClick={() => setShowDeferred(!showDeferred)}
						>
							{showDeferred ? 'Hide' : 'Show'} deferred today ({deferredTodos.length})
						</button>
						{showDeferred && (
							<div className="list-group" style={{ opacity: '0.6' }}>
								{deferredTodos.map((todo, idx) => renderTodoCard(todo, idx, false))}
							</div>
						)}
					</div>
				)}

			</>

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
							updateTodo({ ...contextMenu.todo, contextId: id });
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
						updateTodo({ ...contextMenu.todo, contextId: null });
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

export default Todo;
