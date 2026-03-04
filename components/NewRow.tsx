import React, { useEffect, useRef, useState } from 'react';
import { Context, Todo, Tomato } from '@prisma/client';

const RECENT_DESC_KEY = 'elPomodoro_recentDesc';

const getRecentDescs = (): string[] => {
	try {
		return JSON.parse(localStorage.getItem(RECENT_DESC_KEY) || '[]');
	} catch {
		return [];
	}
};

const pushRecentDesc = (desc: string) => {
	const existing = getRecentDescs().filter((d) => d !== desc);
	const updated = [desc, ...existing].slice(0, 5);
	localStorage.setItem(RECENT_DESC_KEY, JSON.stringify(updated));
};

export interface NewRowProps {
	onSubmit: (reloadedTomatoes: Array<Tomato | Todo>) => void;
	selectedContext?: Context;
	field: string;
	lastTomato?: Tomato | null;
}

const NewRow: React.FC<NewRowProps> = (props) => {
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [recentDescs, setRecentDescs] = useState<string[]>([]);
	const [prefillContextId, setPrefillContextId] = useState<string | null>(null);
	const [celebrateText, setCelebrateText] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!celebrateText) return;
		const id = setTimeout(() => setCelebrateText(null), 2500);
		return () => clearTimeout(id);
	}, [celebrateText]);

	useEffect(() => {
		setRecentDescs(getRecentDescs());
	}, []);

	const prefillFromLast = () => {
		if (!props.lastTomato) return;
		if (inputRef.current) {
			inputRef.current.value = props.lastTomato.description;
		}
		setPrefillContextId(props.lastTomato.contextId || null);
	};

	const submitForm = async (val) => {
		val.preventDefault();

		const description = val.target[0].value;
		const contextId = prefillContextId ?? (props.selectedContext ? props.selectedContext.id : null);

		const response = await fetch(`/api/${props.field}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				description,
				contextId
			})
		});

		const result = await response.json();
		props.onSubmit(result);

		if (props.field === 'tomato') {
			const today = new Date();
			const todayStr = `${today.getDate()}${today.getMonth() + 1}${today.getFullYear()}`;
			const todayCount = (result as Array<any>).filter((t) => {
				if (t.deleted) return false;
				const d = new Date(t.finished * 1000);
				return `${d.getDate()}${d.getMonth() + 1}${d.getFullYear()}` === todayStr;
			}).length;
			setCelebrateText(`Session complete! Today: ${todayCount} session${todayCount === 1 ? '' : 's'}`);
		}

		// Save to recent descriptions
		pushRecentDesc(description);
		setRecentDescs(getRecentDescs());

		val.target[0].value = '';
		setPrefillContextId(null);
		setIsSaving(false);
	};

	return (
		<>
		{celebrateText && (
			<div
				className="alert alert-success mb-0"
				role="alert"
				style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
			>
				🍅 {celebrateText}
			</div>
		)}
		<div className="row pb-lg-4">
			<div className="col-sm">
				{props.field === 'tomato' && props.lastTomato && (
					<button
						type="button"
						className="btn btn-outline-secondary btn-sm mb-2"
						onClick={prefillFromLast}
					>
						Same as last time: &ldquo;{props.lastTomato.description}&rdquo;
					</button>
				)}
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
							ref={inputRef}
							type="text"
							className="form-control"
							aria-label="Default"
							aria-describedby="inputGroup-sizing-default"
							maxLength={255}
							required
							list="recentDesc"
						/>
						<datalist id="recentDesc">
							{recentDescs.map((desc, i) => (
								<option key={i} value={desc} />
							))}
						</datalist>
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
		</>
	);
};

export default NewRow;
