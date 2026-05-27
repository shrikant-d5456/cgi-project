import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Lint from './pages/Lint';
import Processing from './pages/Processing';

function App() {
	return (
		<div className="min-h-screen bg-slate-100">
			<Header />

			<div className="mx-auto flex w-full max-w-[1440px] gap-4 px-4 pb-4 pt-20 sm:px-6 lg:px-8">
				<Sidebar />

				<main className="min-h-[calc(100vh-6rem)] flex-1 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
					<Routes>
						<Route path="/" element={<Navigate to="/lint" replace />} />
						<Route path="/lint" element={<Lint />} />
						<Route path="/processing" element={<Processing />} />
						<Route path="*" element={<Navigate to="/lint" replace />} />
					</Routes>
				</main>
			</div>
		</div>
	);
}

export default App;