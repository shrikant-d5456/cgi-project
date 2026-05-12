import React, { useEffect, useState } from 'react';
 import * as pdfjsLib from 'pdfjs-dist';
 import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
 import Tesseract from 'tesseract.js';
 import { compareTwoStrings } from 'string-similarity';

function App() {

 // =========================================
 // PDF WORKER
 // =========================================

 useEffect(() => {
 pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
 }, []);

 // =========================================
 // STATES
 // =========================================

 const [transactionCertificate, setTransactionCertificate] =
 useState(null);

 const [ewayBill, setEwayBill] =
 useState(null);

 const [comparisonResult, setComparisonResult] =
 useState([]);

 const [isLoading, setIsLoading] =
 useState(false);

 const [error, setError] =
 useState('');

 // =========================================
 // FILE HANDLERS
 // =========================================

 const handleTransactionCertificateChange = (e) => {
 setTransactionCertificate(e.target.files[0]);
 };

 const handleEwayBillChange = (e) => {
 setEwayBill(e.target.files[0]);
 };

 // =========================================
 // OCR PDF
 // =========================================

 const extractTextFromPdf = async (file) => {

 const loadingTask = pdfjsLib.getDocument(
 URL.createObjectURL(file)
 );

 const pdf = await loadingTask.promise;

 let fullText = '';

 for (let i = 1; i <= pdf.numPages; i++) {

 const page = await pdf.getPage(i);

 const viewport = page.getViewport({
 scale: 2,
 });

 const canvas =
 document.createElement('canvas');

 const context =
 canvas.getContext('2d');

 canvas.height = viewport.height;
 canvas.width = viewport.width;

 await page.render({
 canvasContext: context,
 viewport,
 }).promise;

 const {
 data: { text },
 } = await Tesseract.recognize(
 canvas,
 'eng'
 );

 fullText += '\n' + text;
 }

 return fullText;
 };

 // =========================================
 // NORMALIZE DATE
 // =========================================

 const normalizeDate = (dateString) => {

 if (!dateString) return '';

 const cleaned = dateString.trim();

 // YYYY-MM-DD
 if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
 return cleaned.substring(0, 10);
 }

 // DD/MM/YYYY
 const match = cleaned.match(
 /^(\d{2})\/(\d{2})\/(\d{4})/
 );

 if (match) {
 return `${match[3]}-${match[2]}-${match[1]}`;
 }

 return cleaned;
 };

 // =========================================
 // CLEAN INVOICE
 // =========================================

 const cleanInvoice = (value) => {

 if (!value) return '';

 const match =
 value.match(/BTSale-\d+/i);

 return match
 ? match[0].trim()
 : value.trim();
 };

 // =========================================
 // PARSE SHIPMENT DATA
 // =========================================

 const parseShipmentData = (text, docType) => {

 const shipments = [];

 // =====================================
 // TRANSACTION CERTIFICATE
 // =====================================

 if (docType === 'tc') {

 const shipmentBlocks = text.split(
 /(?=Shipment\s*No[\s:.,-]*\d+)/gi
 );

 shipmentBlocks.forEach((block) => {

 if (!block.includes('Shipment')) {
 return;
 }

 const shipment = {};

 // Shipment Date
 const dateMatch = block.match(
 /Shipment\s*Date[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i
 );

 if (dateMatch) {
 shipment.ShipmentDate =
 dateMatch[1].trim();
 }

 // Shipment Doc No
 const docMatch = block.match(
 /Shipment\s*Doc\s*No\.?[:\s]*([0-9\s]+)/i
 );

 if (docMatch) {
 shipment.ShipmentDocNo =
 docMatch[1]
 .replace(/\s/g, '')
 .trim();
 }

 // Invoice Reference
 const invoiceMatch = block.match(
 /Invoice\s*References?[:\s]*([A-Za-z0-9-]+)/i
 );

 if (invoiceMatch) {
 shipment.InvoiceReferences =
 invoiceMatch[1].trim();
 }

 // Push valid shipment
 if (
 shipment.ShipmentDate ||
 shipment.ShipmentDocNo ||
 shipment.InvoiceReferences
 ) {
 shipments.push(shipment);
 }
 });
 }

 // =====================================
 // E-WAY BILL
 // =====================================

 else {

 const ewayBlocks = text.split(
 /(?=E-Way\s*Bill\s*No[:\s]*)/gi
 );

 ewayBlocks.forEach((block) => {

 const shipment = {};

 // EWB Number
 const billMatch = block.match(
 /E-Way\s*Bill\s*No[:\s]*([0-9\s]+)/i
 );

 if (billMatch) {
 shipment.ShipmentDocNo =
 billMatch[1]
 .replace(/\s/g, '')
 .trim();
 }

 // EWB Date
 const dateMatch = block.match(
 /E-Way\s*Bill\s*Date[:\s|]*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i
 );

 if (dateMatch) {
 shipment.ShipmentDate =
 dateMatch[1].trim();
 }

 // Document No
 const invoiceMatch = block.match(
 /Document\s*No\.?[:\s]*([A-Za-z0-9-]+)/i
 );

 if (invoiceMatch) {
 shipment.InvoiceReferences =
 invoiceMatch[1].trim();
 }

 // Push valid shipment
 if (
 shipment.ShipmentDate ||
 shipment.ShipmentDocNo ||
 shipment.InvoiceReferences
 ) {
 shipments.push(shipment);
 }
 });
 }

 return shipments;
 };

 // =========================================
 // COMPARE
 // =========================================

 const handleCompare = async () => {

 if (!transactionCertificate || !ewayBill) {
 alert('Upload both PDFs');
 return;
 }

 try {

 setIsLoading(true);
 setError('');
 setComparisonResult([]);

 // OCR TC
 const tcText =
 await extractTextFromPdf(
 transactionCertificate
 );

 // OCR EWAY
 const ewayText =
 await extractTextFromPdf(
 ewayBill
 );

 console.log(
 'TC OCR TEXT:',
 tcText
 );

 console.log(
 'EWAY OCR TEXT:',
 ewayText
 );

 // Parse
 const tcShipments =
 parseShipmentData(
 tcText,
 'tc'
 );

 const ewayShipments =
 parseShipmentData(
 ewayText,
 'eway'
 );

 console.log(
 'TC SHIPMENTS:',
 tcShipments
 );

 console.log(
 'EWAY SHIPMENTS:',
 ewayShipments
 );

 if (tcShipments.length === 0) {
 throw new Error(
 'No shipments found in Transaction Certificate'
 );
 }

 if (ewayShipments.length === 0) {
 throw new Error(
 'No shipments found in E-Way Bill'
 );
 }

 const fieldsToCompare = [
 'ShipmentDate',
 'ShipmentDocNo',
 'InvoiceReferences',
 ];

 const results = [];

 tcShipments.forEach(
 (tcShipment, index) => {

 // Match by invoice number
 const matchedEway =
 ewayShipments.find(
 (eway) =>
 cleanInvoice(
 eway.InvoiceReferences
 )
 .toLowerCase() ===
 cleanInvoice(
 tcShipment.InvoiceReferences
 )
 .toLowerCase()
 );

 const fields = {};

 fieldsToCompare.forEach(
 (field) => {

 const tcOriginal =
 tcShipment[field] ||
 'Not Found';

 const ewayOriginal =
 matchedEway
 ? matchedEway[field] ||
 'Not Found'
 : 'Not Found';

 let tcCompare =
 tcOriginal;

 let ewayCompare =
 ewayOriginal;

 // Normalize date
 if (
 field === 'ShipmentDate'
 ) {
 tcCompare =
 normalizeDate(
 tcCompare
 );

 ewayCompare =
 normalizeDate(
 ewayCompare
 );
 }

 // Clean invoice
 if (
 field ===
 'InvoiceReferences'
 ) {
 tcCompare =
 cleanInvoice(
 tcCompare
 );

 ewayCompare =
 cleanInvoice(
 ewayCompare
 );
 }

 const similarity =
 compareTwoStrings(
 tcCompare
 .toLowerCase(),
 ewayCompare
 .toLowerCase()
 );

 fields[field] = {
 tcValue: tcOriginal,
 ewayValue:
 ewayOriginal,
 match:
 tcCompare ===
 ewayCompare,
 similarity:
 (
 similarity * 100
 ).toFixed(2) + '%',
 };
 }
 );

 results.push({
 shipmentId:
 `TC Shipment ${
 index + 1
 }`,
 fields,
 });
 }
 );

 setComparisonResult(results);

 } catch (err) {

 console.error(err);

 setError(
 err.message ||
 'Error while comparing documents'
 );

 } finally {

 setIsLoading(false);
 }
 };

 // =========================================
 // UI
 // =========================================

 return (
 <div className="min-h-screen bg-gray-100 p-10">

 <div className="max-w-7xl mx-auto bg-white p-8 rounded-lg shadow-lg">

 <h1 className="text-3xl font-bold mb-8 text-center">
 Shipment Information Verification
 </h1>

 {/* Upload TC */}
 <div className="mb-6">

 <label className="block text-sm font-semibold mb-2">
 Upload Transaction Certificate PDF
 </label>

 <input
 type="file"
 accept=".pdf"
 onChange={
 handleTransactionCertificateChange
 }
 className="w-full border p-3 rounded"
 />
 </div>

 {/* Upload EWB */}
 <div className="mb-6">

 <label className="block text-sm font-semibold mb-2">
 Upload E-Way Bill PDF
 </label>

 <input
 type="file"
 accept=".pdf"
 onChange={handleEwayBillChange}
 className="w-full border p-3 rounded"
 />
 </div>

 {/* Button */}
 <button
 onClick={handleCompare}
 disabled={isLoading}
 className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded font-semibold"
 >
 {isLoading
 ? 'Processing PDFs...'
 : 'Compare Documents'}
 </button>

 {/* Loading */}
 {isLoading && (
 <div className="mt-6 text-blue-600 font-semibold">
 OCR Processing...
 </div>
 )}

 {/* Error */}
 {error && (
 <div className="mt-6 bg-red-100 text-red-700 p-4 rounded">
 {error}
 </div>
 )}

 {/* Results */}
 {comparisonResult.length > 0 && (

 <div className="mt-10">

 <h2 className="text-2xl font-bold mb-6">
 Comparison Results
 </h2>

 {comparisonResult.map(
 (result) => (

 <div
 key={
 result.shipmentId
 }
 className="mb-10 overflow-x-auto"
 >

 <h3 className="text-xl font-semibold mb-3">
 {result.shipmentId}
 </h3>

 <table className="min-w-full border border-gray-300">

 <thead className="bg-gray-100">

 <tr>

 <th className="border p-3 text-left">
 Field
 </th>

 <th className="border p-3 text-left">
 Transaction Certificate
 </th>

 <th className="border p-3 text-left">
 E-Way Bill
 </th>

 <th className="border p-3 text-left">
 Match
 </th>

 <th className="border p-3 text-left">
 Similarity
 </th>

 </tr>

 </thead>

 <tbody>

 {Object.entries(
 result.fields
 ).map(
 ([
 field,
 values,
 ]) => (

 <tr
 key={field}
 >

 <td className="border p-3 font-medium">
 {field}
 </td>

 <td className="border p-3">
 {
 values.tcValue
 }
 </td>

 <td className="border p-3">
 {
 values.ewayValue
 }
 </td>

 <td
 className={`border p-3 font-bold ${
 values.match
 ? 'text-green-600'
 : 'text-red-600'
 }`}
 >
 {values.match
 ? 'Yes'
 : 'No'}
 </td>

 <td className="border p-3">
 {
 values.similarity
 }
 </td>

 </tr>
 )
 )}

 </tbody>

 </table>

 </div>
 )
 )}
 </div>
 )}
 </div>
 </div>
 );
 }

export default App;