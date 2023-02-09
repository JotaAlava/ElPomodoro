import React, { useState } from 'react';
import { Context, Todo, Tomato } from '@prisma/client';

export interface NewRowProps {
	onSubmit: (reloadedTomatoes: Array<Tomato | Todo>) => void;
	selectedContext?: Context;
	field: string;
}

const NewRow: React.FC<NewRowProps> = (props) => {
	const [isSaving, setIsSaving] = useState<boolean>(false);
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
		setIsSaving(false);
	};

	return (
		<div className="row pb-lg-4">
			<div className="col-sm">
				<form
					onSubmit={(val) => {
						setIsSaving(true);
						submitForm(val);
					}}
				>
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
						{isSaving ? (
							<button className="btn btn-primary" type="button" disabled>
								<span
									className="spinner-border spinner-border-sm me-1"
									role="status"
									aria-hidden="true"
								></span>
								Saving...
							</button>
						) : (
							<button type="submit" className="btn btn-primary">
								Submit
							</button>
						)}
					</div>
				</form>
			</div>
		</div>
	);
};

export default NewRow;
