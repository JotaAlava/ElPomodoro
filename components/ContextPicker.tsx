import { Context } from '@prisma/client';
import React from 'react';
import Router from 'next/router';

export interface ContextPickerProps {
	contexts: Array<Context>;
	contextSelected: React.Dispatch<React.SetStateAction<Context>>;
}

const ContextPicker: React.FC<ContextPickerProps> = ({
	contexts,
	contextSelected
}) => {
	const selectionChanged = (val) => {
		const element = val.target.value;

		if (element === '-2') {
			Router.push('/context');
		} else {
			const selectedContext = contexts.find((ctx) => {
				return ctx.id === element;
			});

			contextSelected(selectedContext);
		}
	};

	return (
		<div className="row pb-lg-4">
			<div className="col-sm">
				<select
					className="form-select"
					aria-label="Default select example"
					defaultValue={'-1'}
					onChange={selectionChanged}
				>
					<option key={-2} value="-2">
						New Context
					</option>
					<option key={-1} value="-1">
						No context
					</option>
					{contexts.map((context, idx) => {
						return (
							<option key={idx} value={context.id}>
								{context.description}
							</option>
						);
					})}
				</select>
			</div>
		</div>
	);
};

export default ContextPicker;
