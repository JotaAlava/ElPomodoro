import React, { useState } from 'react';
import NewRow from './NewRow';
import { Todo } from '@prisma/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquareCheck } from '@fortawesome/free-regular-svg-icons';

export interface TodoProps {
	todos: Array<Todo>;
}

const Todo: React.FC<TodoProps> = (props) => {
	const [loadedTodos, setLoadedTodos] = useState<Array<Todo>>(props.todos);

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

	return (
		<div className="col-sm">
			<h3>TODOs</h3>
			<NewRow field="todo" onSubmit={onSave}></NewRow>
			<div id="list-example" className="list-group">
				{loadedTodos.map((todo, idx) => {
					return (
						<a
							key={idx}
							className="list-group-item list-group-item-action"
							href="#"
							onClick={() => {
								complete(todo);
							}}
						>
							{todo.description}
						</a>
					);
				})}
			</div>
		</div>
	);
};

export default Todo;
