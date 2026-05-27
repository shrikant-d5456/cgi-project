import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import Tesseract from 'tesseract.js';
import { compareTwoStrings } from 'string-similarity';

function Lint() {
	useEffect(() => {
		pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
	}, []);

	const [transactionCertificate, setTransactionCertificate] = useState(null);
	const [ewayBill, setEwayBill] = useState(null);
	const [comparisonResult, setComparisonResult] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const handleTransactionCertificateChange = (e) => {
		setTransactionCertificate(e.target.files[0]);
	};

	const handleEwayBillChange = (e) => {
		setEwayBill(e.target.files[0]);
	};

	const extractTextFromPdf = async (file) => {
		const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
		const pdf = await loadingTask.promise;
		let fullText = '';

		for (let i = 1; i <= pdf.numPages; i += 1) {
			const page = await pdf.getPage(i);
			const viewport = page.getViewport({ scale: 4 });
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');

			canvas.height = viewport.height;
			canvas.width = viewport.width;

			await page.render({ canvasContext: context, viewport }).promise;

			const {
				data: { text },
			} = await Tesseract.recognize(canvas, 'eng');

			fullText += `\n${text}`;
		}

		return fullText;
	};

	const cleanText = (value = '') => value.replace(/\|/g, '').replace(/\s+/g, ' ').trim();
	const normalizeNumber = (value = '') => value.replace(/\D/g, '');

	const cleanInvoice = (value = '') => {
		const cleaned = cleanText(value);
		const match = cleaned.match(/BTSale[-\s]*\d+/i);

		if (!match) {
			return cleaned.toUpperCase();
		}

		return match[0].replace(/\s+/g, '').trim().toUpperCase();
	};

	const normalizeDate = (dateString = '') => {
		const cleaned = cleanText(dateString);

		if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
			return cleaned.substring(0, 10);
		}

		const match = cleaned.match(/(\d{2})\/(\d{2})\/(\d{4})/);
		if (match) {
			return `${match[3]}-${match[2]}-${match[1]}`;
		}

		return cleaned;
	};

	const parseShipmentData = (text, docType) => {
		const shipments = [];
		const normalizedText = text.replace(/\r/g, '\n');

		if (docType === 'tc') {
			const blocks = normalizedText.split(/(?=Shipment\s*No)/gi);

			blocks.forEach((block) => {
				const shipment = {};

				const dateMatch = block.match(
					/Shipment\s*Date[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i,
				);
				if (dateMatch) {
					shipment.ShipmentDate = normalizeDate(dateMatch[1]);
				}

				const docMatch = block.match(/Shipment\s*Doc\s*No\.?[:\s]*([0-9\s]+)/i);
				if (docMatch) {
					shipment.ShipmentDocNo = normalizeNumber(docMatch[1]);
				}

				const invoiceMatch = block.match(/Invoice\s*References?[:\s]*([A-Za-z0-9-]+)/i);
				if (invoiceMatch) {
					shipment.InvoiceReferences = cleanInvoice(invoiceMatch[1]);
				}

				if (shipment.ShipmentDate || shipment.ShipmentDocNo || shipment.InvoiceReferences) {
					shipments.push(shipment);
				}
			});
		} else {
			const blocks = normalizedText.split(/(?=E-Way\s*Bill\s*No)/gi);

			blocks.forEach((block) => {
				const shipment = {};

				const billMatch = block.match(/E-Way\s*Bill\s*No[:\s]*([0-9\s]+)/i);
				if (billMatch) {
					shipment.ShipmentDocNo = normalizeNumber(billMatch[1]);
				}

				const dateMatch = block.match(/E-Way\s*Bill\s*Date[:\s|]*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
				if (dateMatch) {
					shipment.ShipmentDate = normalizeDate(dateMatch[1]);
				}

				const invoiceMatch = block.match(/Document\s*No\.?[:\s|]*([A-Za-z0-9-]+)/i);
				if (invoiceMatch) {
					shipment.InvoiceReferences = cleanInvoice(invoiceMatch[1]);
				}

				if (shipment.ShipmentDate || shipment.ShipmentDocNo || shipment.InvoiceReferences) {
					shipments.push(shipment);
				}
			});
		}

		return shipments;
	};

	const handleCompare = async () => {
		if (!transactionCertificate || !ewayBill) {
			setError('Upload both PDFs before comparing.');
			return;
		}

		try {
			setIsLoading(true);
			setError('');
			setComparisonResult([]);

			const tcText = await extractTextFromPdf(transactionCertificate);
			const ewayText = await extractTextFromPdf(ewayBill);

			const tcShipments = parseShipmentData(tcText, 'tc');
			const ewayShipments = parseShipmentData(ewayText, 'eway');

			if (tcShipments.length === 0 || ewayShipments.length === 0) {
				throw new Error('Could not find shipment rows in one of the files.');
			}

			const fieldsToCompare = ['ShipmentDate', 'ShipmentDocNo', 'InvoiceReferences'];
			const results = [];

			tcShipments.forEach((tcShipment, index) => {
				const matchedEway = ewayShipments.find((eway) => {
					const tcInvoice = cleanInvoice(tcShipment.InvoiceReferences || '');
					const ewayInvoice = cleanInvoice(eway.InvoiceReferences || '');
					const invoiceSimilarity = compareTwoStrings(tcInvoice.toLowerCase(), ewayInvoice.toLowerCase());

					const tcDoc = normalizeNumber(tcShipment.ShipmentDocNo || '');
					const ewayDoc = normalizeNumber(eway.ShipmentDocNo || '');

					return invoiceSimilarity > 0.7 || tcDoc === ewayDoc;
				});

				const fields = {};

				fieldsToCompare.forEach((field) => {
					const tcOriginal = tcShipment[field] || 'Not Found';
					const ewayOriginal = matchedEway ? matchedEway[field] || 'Not Found' : 'Not Found';

					let tcCompare = tcOriginal;
					let ewayCompare = ewayOriginal;

					if (field === 'ShipmentDate') {
						tcCompare = normalizeDate(tcCompare);
						ewayCompare = normalizeDate(ewayCompare);
					}

					if (field === 'ShipmentDocNo') {
						tcCompare = normalizeNumber(tcCompare);
						ewayCompare = normalizeNumber(ewayCompare);
					}

					if (field === 'InvoiceReferences') {
						tcCompare = cleanInvoice(tcCompare);
						ewayCompare = cleanInvoice(ewayCompare);
					}

					const similarity = compareTwoStrings(tcCompare.toLowerCase(), ewayCompare.toLowerCase());

					fields[field] = {
						tcValue: tcOriginal,
						ewayValue: ewayOriginal,
						match: tcCompare === ewayCompare,
						similarity: `${(similarity * 100).toFixed(2)}%`,
					};
				});

				results.push({
					shipmentId: `TC Shipment ${index + 1}`,
					fields,
				});
			});

			setComparisonResult(results);
		} catch (err) {
			setError(err.message || 'Error comparing files.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<section>
			<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-slate-900">Lint Page</h2>
					<p className="text-sm text-slate-500">Compare shipment fields between TC and E-Way PDFs.</p>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="rounded-xl border border-slate-200 p-4">
					<label className="mb-2 block text-sm font-semibold text-slate-700">Upload Transaction Certificate PDF</label>
					<input
						type="file"
						accept=".pdf"
						onChange={handleTransactionCertificateChange}
						className="w-full rounded-lg border border-slate-300 p-2 text-sm"
					/>
				</div>

				<div className="rounded-xl border border-slate-200 p-4">
					<label className="mb-2 block text-sm font-semibold text-slate-700">Upload E-Way Bill PDF</label>
					<input
						type="file"
						accept=".pdf"
						onChange={handleEwayBillChange}
						className="w-full rounded-lg border border-slate-300 p-2 text-sm"
					/>
				</div>
			</div>

			<button
				type="button"
				onClick={handleCompare}
				disabled={isLoading}
				className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
			>
				{isLoading ? 'Processing PDFs...' : 'Compare Documents'}
			</button>

			{isLoading && <p className="mt-4 text-sm font-semibold text-blue-600">OCR is running, please wait...</p>}

			{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

			{comparisonResult.length > 0 && (
				<div className="mt-8 space-y-6">
					<h3 className="text-xl font-bold text-slate-900">Comparison Results</h3>

					{comparisonResult.map((result) => (
						<div key={result.shipmentId} className="overflow-x-auto rounded-xl border border-slate-200">
							<div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
								{result.shipmentId}
							</div>

							<table className="min-w-full text-sm">
								<thead className="bg-slate-100 text-slate-700">
									<tr>
										<th className="border-b border-slate-200 px-4 py-3 text-left">Field</th>
										<th className="border-b border-slate-200 px-4 py-3 text-left">Transaction Certificate</th>
										<th className="border-b border-slate-200 px-4 py-3 text-left">E-Way Bill</th>
										<th className="border-b border-slate-200 px-4 py-3 text-left">Match</th>
										<th className="border-b border-slate-200 px-4 py-3 text-left">Similarity</th>
									</tr>
								</thead>

								<tbody>
									{Object.entries(result.fields).map(([field, values]) => (
										<tr key={field} className="text-slate-700">
											<td className="border-b border-slate-100 px-4 py-3 font-semibold">{field}</td>
											<td className="border-b border-slate-100 px-4 py-3">{values.tcValue}</td>
											<td className="border-b border-slate-100 px-4 py-3">{values.ewayValue}</td>
											<td
												className={`border-b border-slate-100 px-4 py-3 font-bold ${
													values.match ? 'text-green-600' : 'text-red-600'
												}`}
											>
												{values.match ? 'Yes' : 'No'}
											</td>
											<td className="border-b border-slate-100 px-4 py-3">{values.similarity}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					))}
				</div>
			)}
		</section>
	);
}

export default Lint;
