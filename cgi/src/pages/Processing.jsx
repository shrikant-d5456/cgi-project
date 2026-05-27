function Processing() {
	return (
		<section>
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-slate-900">Processing Page</h2>
				<p className="mt-1 text-sm text-slate-500">
					This page can be used for live processing logs, queue status, and OCR progress tracking.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current Jobs</p>
					<p className="mt-3 text-3xl font-bold text-slate-900">0</p>
				</article>

				<article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Completed Today</p>
					<p className="mt-3 text-3xl font-bold text-slate-900">0</p>
				</article>

				<article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Errors</p>
					<p className="mt-3 text-3xl font-bold text-slate-900">0</p>
				</article>
			</div>

			<div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6">
				<p className="text-sm font-semibold text-slate-700">No active processing yet.</p>
				<p className="mt-1 text-sm text-slate-500">Start a new document run from the Lint page.</p>
			</div>
		</section>
	);
}

export default Processing;
