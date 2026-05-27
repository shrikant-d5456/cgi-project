import { NavLink } from 'react-router-dom';

const navItems = [
	{ path: '/lint', label: 'Lint Page' },
	{ path: '/processing', label: 'Processing Page' },
];

function Sidebar() {
	return (
		<aside className="sticky top-20 h-fit w-64 rounded-2xl bg-slate-900 p-4 text-slate-100 shadow-sm">
			<p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Navigation</p>

			<nav className="space-y-2">
				{navItems.map((item) => {
					return (
						<NavLink
							key={item.path}
							to={item.path}
							className={({ isActive }) =>
								`block w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
									isActive
										? 'bg-blue-500 text-white'
										: 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
								}`
							}
						>
							{item.label}
						</NavLink>
					);
				})}
			</nav>
		</aside>
	);
}

export default Sidebar;
