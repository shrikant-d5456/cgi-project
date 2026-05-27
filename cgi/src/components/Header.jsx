function Header() {
	return (
		<header className="fixed inset-x-0 top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">CGI</p>
					<h1 className="text-lg font-bold text-slate-900">Document Verification Dashboard</h1>
				</div>

				<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
					Internal Tool
				</div>
			</div>
		</header>
	);
}

export default Header;
