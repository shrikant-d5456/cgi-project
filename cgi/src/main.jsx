import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// import { useState, useEffect } from 'react';
// import * as pdfjsLib from 'pdfjs-dist';
// import Tesseract from 'tesseract.js';
// import { compareTwoStrings } from 'string-similarity';
// import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';

// function App() {
//   useEffect(() => {
//     pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
//   }, []);
  
//   const [transactionCertificate, setTransactionCertificate] = useState(null);
//   const [ewayBill, setEwayBill] = useState(null);
//   const [comparisonResult, setComparisonResult] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const handleTransactionCertificateChange = (e) => {
//     setTransactionCertificate(e.target.files[0]);
//   };

//   const handleEwayBillChange = (e) => {
//     setEwayBill(e.target.files[0]);
//   };

//   const extractTextFromPdf = async (file) => {
//     const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
//     const pdf = await loadingTask.promise;
//     let text = '';
//     for (let i = 1; i <= pdf.numPages; i++) {
//       const page = await pdf.getPage(i);
//       const viewport = page.getViewport({ scale: 2 });
//       const canvas = document.createElement('canvas');
//       const context = canvas.getContext('2d');
//       canvas.height = viewport.height;
//       canvas.width = viewport.width;
//       await page.render({ canvasContext: context, viewport: viewport }).promise;
//       const { data: { text: pageText } } = await Tesseract.recognize(canvas, 'eng');
//       text += pageText;
//     }
//     return text;
//   };

//   const parseInformation = (text) => {
//     const info = {};
//     // Simple regex patterns to find key-value pairs.
//     // These will need to be adjusted for the specific document formats.
//     const patterns = {
//       ShipmentDate: /Shipment Date[:\s]+(\S+)/i, //*
//       ShipmentDocNo: /Shipment Doc No[.:\s]+(\S+)/i,  //*
//       InvoiceReferences: /Invoice References[:\s]+(\S+)/i,  //*
//     };

//     for (const key in patterns) {
//       const match = text.match(patterns[key]);
//       if (match && match[1]) {
//         info[key] = match[1].trim();
//       }
//     }
//     return info;
//   };


//   const handleCompare = async () => {
//     if (!transactionCertificate || !ewayBill) return;

//     setIsLoading(true);
//     setError(null);
//     setComparisonResult(null);

//     try {
//       const tcText = await extractTextFromPdf(transactionCertificate);
//       const ewayText = await extractTextFromPdf(ewayBill);

//       const tcInfo = parseInformation(tcText);
//       const ewayInfo = parseInformation(ewayText);

//       const fieldsToCompare = ['ShipmentDate', 'ShipmentDocNo', 'InvoiceReferences'];
//       const results = {};

//       fieldsToCompare.forEach(field => {
//         const tcValue = tcInfo[field] || 'Not Found';
//         const ewayValue = ewayInfo[field] || 'Not Found';
//         const similarity = compareTwoStrings(tcValue.toLowerCase(), ewayValue.toLowerCase());
//         results[field] = {
//           tcValue,
//           ewayValue,
//           match: similarity > 0.8, // 80% similarity threshold
//           similarity: (similarity * 100).toFixed(2) + '%',
//         };
//       });

//       setComparisonResult(results);

//     } catch (err) {
//       console.error(err);
//       setError('An error occurred while processing the documents. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
//       <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-md">
//         <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
//           Shipment Information Verification
//         </h1>
//         <div className="space-y-6">
//           <div>
//             <label
//               htmlFor="transaction-certificate"
//               className="block text-sm font-medium text-gray-700 mb-2"
//             >
//               Upload Transaction Certificate Draft
//             </label>
//             <input
//               id="transaction-certificate"
//               type="file"
//               onChange={handleTransactionCertificateChange}
//               className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
//             />
//           </div>
//           <div>
//             <label
//               htmlFor="eway-bill"
//               className="block text-sm font-medium text-gray-700 mb-2"
//             >
//               Upload E-way Bill
//             </label>
//             <input
//               id="eway-bill"
//               type="file"
//               onChange={handleEwayBillChange}
//               className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
//             />
//           </div>
//           <div>
//             <button
//               onClick={handleCompare}
//               disabled={!transactionCertificate || !ewayBill}
//               className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
//             >
//               Compare Documents
//             </button>
//           </div>
//         </div>

//         {isLoading && (
//           <div className="mt-6 text-center">
//             <p className="text-lg text-gray-600">Comparing documents, please wait...</p>
//           </div>
//         )}

//         {error && (
//           <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-lg">
//             <p>{error}</p>
//           </div>
//         )}

//         {comparisonResult && (
//           <div className="mt-8">
//             <h2 className="text-2xl font-bold mb-4 text-gray-800">Comparison Result</h2>
//             <div className="overflow-x-auto">
//               <table className="min-w-full bg-white border border-gray-200">
//                 <thead>
//                   <tr className="bg-gray-50">
//                     <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Field</th>
//                     <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Transaction Certificate</th>
//                     <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">E-way Bill</th>
//                     <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Match</th>
//                     <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Similarity</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {Object.entries(comparisonResult).map(([field, values]) => (
//                     <tr key={field} className="hover:bg-gray-50">
//                       <td className="py-3 px-4 border-b text-sm text-gray-700 font-medium">{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
//                       <td className="py-3 px-4 border-b text-sm text-gray-700">{values.tcValue}</td>
//                       <td className="py-3 px-4 border-b text-sm text-gray-700">{values.ewayValue}</td>
//                       <td className={`py-3 px-4 border-b text-sm font-bold ${values.match ? 'text-green-600' : 'text-red-600'}`}>
//                         {values.match ? 'Yes' : 'No'}
//                       </td>
//                       <td className="py-3 px-4 border-b text-sm text-gray-700">{values.similarity}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }

// export default App;
