import React, { Dispatch, SetStateAction, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faPenToSquare,
	faTrashCan,
	faCheckCircle,
	faXmarkCircle
} from '@fortawesome/free-regular-svg-icons';
import { Context } from '@prisma/client';

export interface ContextsListProps {
	contexts: Array<Context>;
	edit: Dispatch<SetStateAction<Context>>;
	del: Dispatch<SetStateAction<Context>>;
}

const ContextsList: React.FC<ContextsListProps> = ({ contexts, edit, del }) => {
	const [ctxToDelete, setCtxToDelete] = useState<{ [id: number]: boolean }>({});

	return contexts.length > 0 ? (
		<div className="list-group">
			{contexts.map((context) => {
				return (
					<div className="list-group-item d-flex justify-content-between">
						<span className="d-flex justify-content-start align-items-center">
							{ctxToDelete[context.id] ? (
								<del>{context.description}</del>
							) : (
								<span>{context.description}</span>
							)}
						</span>
						<div>
							{!ctxToDelete[context.id] ? (
								<FontAwesomeIcon
									className="m-1"
									icon={faPenToSquare}
									role="button"
									onClick={() => {
										edit(context);
									}}
								/>
							) : (
								<FontAwesomeIcon
									className="m-1"
									icon={faCheckCircle}
									role="button"
									onClick={() => {
										del(context);

										setCtxToDelete({
											...ctxToDelete,
											[context.id]: false
										});
									}}
								/>
							)}

							{ctxToDelete[context.id] ? (
								<FontAwesomeIcon
									className="m-1"
									icon={faXmarkCircle}
									role="button"
									onClick={() => {
										setCtxToDelete({
											...ctxToDelete,
											[context.id]: false
										});
									}}
								/>
							) : (
								<FontAwesomeIcon
									className="m-1"
									icon={faTrashCan}
									role="button"
									onClick={() => {
										setCtxToDelete({
											...ctxToDelete,
											[context.id]: true
										});
									}}
								/>
							)}
						</div>
					</div>
				);
			})}
		</div>
	) : (
		<p className="mt-3 text-center">No contexts</p>
	);
};

export default ContextsList;
