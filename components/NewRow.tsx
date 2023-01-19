import React from 'react';
import { Context, Tomato } from '@prisma/client';

export interface NewRowProps {
	onSubmit: (reloadedTomatoes: Array<Tomato>) => void;
	selectedContext?: Context;
	field: string;
}

const NewRow: React.FC<NewRowProps> = (props) => {
	const submitForm = async (val) => {
		val.preventDefault();

		const response = await fetch(`/api/${props.field}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				description: val.target[0].value,
				contextId: props.selectedContext ? props.selectedContext.id : null
			})
		});

		const result = await response.json();
		props.onSubmit(result);

		val.target[0].value = '';
	};

	return (
		<div className="row pb-lg-4">
			<div className="col-sm">
				<form onSubmit={submitForm}>
					<div className="input-group mb-3">
						<div className="input-group-prepend">
							<span className="input-group-text" id="inputGroup-sizing-default">
								Description
							</span>
						</div>
						<input
							type="text"
							className="form-control"
							aria-label="Default"
							aria-describedby="inputGroup-sizing-default"
							maxLength={255}
							required
						/>

						<button type="submit" className="btn btn-primary">
							Submit
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default NewRow;
