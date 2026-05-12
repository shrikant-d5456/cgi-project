import React, { useEffect, useState } from 'react';
 import * as pdfjsLib from 'pdfjs-dist';
 import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
 import Tesseract from 'tesseract.js';
 import { compareTwoStrings } from 'string-similarity';

function App() {

 // =====================================================
 // PDF WORKER
 // =====================================================

 useEffect(() => {
 pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
 }, []);

 // =====================================================
 // STATES
 // =====================================================

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

 const [tcRawText, setTcRawText] =
 useState('');

 const [ewayRawText, setEwayRawText] =
 useState('');

 // =====================================================
 // FILE HANDLERS
 // =====================================================

 const handleTransactionCertificateChange = (e) => {
 setTransactionCertificate(e.target.files[0]);
 };

 const handleEwayBillChange = (e) => {
 setEwayBill(e.target.files[0]);
 };

 // =====================================================
 // OCR PDF
 // =====================================================

 const extractTextFromPdf = async (file) => {

 const loadingTask =
 pdfjsLib.getDocument(
 URL.createObjectURL(file)
 );

 const pdf =
 await loadingTask.promise;

 let fullText = '';

 for (let i = 1; i <= pdf.numPages; i++) {

 const page =
 await pdf.getPage(i);

 const viewport =
 page.getViewport({
 scale: 4,
 });

 const canvas =
 document.createElement('canvas');

 const context =
 canvas.getContext('2d');

 canvas.height =
 viewport.height;

 canvas.width =
 viewport.width;

 await page.render({
 canvasContext: context,
 viewport,
 }).promise;

 const {
 data: { text },
 } = await Tesseract.recognize(
 canvas,
 'eng',
 {
 logger: (m) =>
 console.log(m),
 }
 );

 fullText += '\n' + text;
 }

 return fullText;
 };

 // =====================================================
 // HELPERS
 // =====================================================

 const cleanText = (value = '') => {
 return value
 .replace(/\|/g, '')
 .replace(/\s+/g, ' ')
 .trim();
 };

 const normalizeNumber = (value = '') => {
 return value.replace(/\D/g, '');
 };

 const cleanInvoice = (value = '') => {

 const cleaned =
 cleanText(value);

 const match =
 cleaned.match(
 /BTSale[-\s]*\d+/i
 );

 if (!match) {
 return cleaned.toUpperCase();
 }

 return match[0]
 .replace(/\s+/g, '')
 .replace(/-/g, '-')
 .trim()
 .toUpperCase();
 };

 const normalizeDate = (dateString = '') => {

 const cleaned =
 cleanText(dateString);

 // YYYY-MM-DD
 if (
 /^\d{4}-\d{2}-\d{2}/
 .test(cleaned)
 ) {
 return cleaned.substring(0, 10);
 }

 // DD/MM/YYYY
 const match =
 cleaned.match(
 /(\d{2})\/(\d{2})\/(\d{4})/
 );

 if (match) {
 return `${match[3]}-${match[2]}-${match[1]}`;
 }

 return cleaned;
 };

 // =====================================================
 // PARSE SHIPMENT DATA
 // =====================================================

 const parseShipmentData = (
 text,
 docType
 ) => {

 const shipments = [];

 text = text.replace(/\r/g, '\n');

 // =================================================
 // TRANSACTION CERTIFICATE
 // =================================================

 if (docType === 'tc') {

 const blocks =
 text.split(
 /(?=Shipment\s*No)/gi
 );

 blocks.forEach((block) => {

 const shipment = {};

 // DATE
 const dateMatch =
 block.match(
 /Shipment\s*Date[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i
 );

 if (dateMatch) {
 shipment.ShipmentDate =
 normalizeDate(
 dateMatch[1]
 );
 }

 // DOC NO
 const docMatch =
 block.match(
 /Shipment\s*Doc\s*No\.?[:\s]*([0-9\s]+)/i
 );

 if (docMatch) {
 shipment.ShipmentDocNo =
 normalizeNumber(
 docMatch[1]
 );
 }

 // INVOICE
 const invoiceMatch =
 block.match(
 /Invoice\s*References?[:\s]*([A-Za-z0-9-]+)/i
 );

 if (invoiceMatch) {
 shipment.InvoiceReferences =
 cleanInvoice(
 invoiceMatch[1]
 );
 }

 if (
 shipment.ShipmentDate ||
 shipment.ShipmentDocNo ||
 shipment.InvoiceReferences
 ) {
 shipments.push(shipment);
 }
 });
 }

 // =================================================
 // E-WAY BILL
 // =================================================

 else {

 const blocks =
 text.split(
 /(?=E-Way\s*Bill\s*No)/gi
 );

 blocks.forEach((block) => {

 const shipment = {};

 // BILL NUMBER
 const billMatch =
 block.match(
 /E-Way\s*Bill\s*No[:\s]*([0-9\s]+)/i
 );

 if (billMatch) {
 shipment.ShipmentDocNo =
 normalizeNumber(
 billMatch[1]
 );
 }

 // DATE
 const dateMatch =
 block.match(
 /E-Way\s*Bill\s*Date[:\s|]*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i
 );

 if (dateMatch) {
 shipment.ShipmentDate =
 normalizeDate(
 dateMatch[1]
 );
 }

 // DOCUMENT NO
 const invoiceMatch =
 block.match(
 /Document\s*No\.?[:\s|]*([A-Za-z0-9-]+)/i
 );

 if (invoiceMatch) {
 shipment.InvoiceReferences =
 cleanInvoice(
 invoiceMatch[1]
 );
 }

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

 // =====================================================
 // COMPARE
 // =====================================================

 const handleCompare = async () => {

 if (
 !transactionCertificate ||
 !ewayBill
 ) {
 alert(
 'Upload both PDFs'
 );
 return;
 }

 try {

 setIsLoading(true);

 setError('');

 setComparisonResult([]);

 // =========================================
 // OCR TC
 // =========================================

 const tcText =
 await extractTextFromPdf(
 transactionCertificate
 );

 // =========================================
 // OCR EWAY
 // =========================================

 const ewayText =
 await extractTextFromPdf(
 ewayBill
 );

 setTcRawText(tcText);

 setEwayRawText(ewayText);

 console.log(
 'TC OCR TEXT:',
 tcText
 );

 console.log(
 'EWAY OCR TEXT:',
 ewayText
 );

 // =========================================
 // PARSE
 // =========================================

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

 if (
 tcShipments.length === 0
 ) {
 throw new Error(
 'No shipments found in TC PDF'
 );
 }

 if (
 ewayShipments.length === 0
 ) {
 throw new Error(
 'No shipments found in EWAY PDF'
 );
 }

 const fieldsToCompare = [
 'ShipmentDate',
 'ShipmentDocNo',
 'InvoiceReferences',
 ];

 const results = [];

 tcShipments.forEach(
 (
 tcShipment,
 index
 ) => {

 // =====================================
 // MATCH LOGIC
 // =====================================

 const matchedEway =
 ewayShipments.find(
 (eway) => {

 const tcInvoice =
 cleanInvoice(
 tcShipment.InvoiceReferences || ''
 );

 const ewayInvoice =
 cleanInvoice(
 eway.InvoiceReferences || ''
 );

 const invoiceSimilarity =
 compareTwoStrings(
 tcInvoice.toLowerCase(),
 ewayInvoice.toLowerCase()
 );

 const tcDoc =
 normalizeNumber(
 tcShipment.ShipmentDocNo || ''
 );

 const ewayDoc =
 normalizeNumber(
 eway.ShipmentDocNo || ''
 );

 return (
 invoiceSimilarity > 0.7 ||
 tcDoc === ewayDoc
 );
 }
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

 // DATE
 if (
 field ===
 'ShipmentDate'
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

 // DOC NO
 if (
 field ===
 'ShipmentDocNo'
 ) {

 tcCompare =
 normalizeNumber(
 tcCompare
 );

 ewayCompare =
 normalizeNumber(
 ewayCompare
 );
 }

 // INVOICE
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
 tcValue:
 tcOriginal,

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
 `TC Shipment ${index + 1}`,
 fields,
 });
 }
 );

 setComparisonResult(
 results
 );

 } catch (err) {

 console.error(err);

 setError(
 err.message ||
 'Error comparing PDFs'
 );

 } finally {

 setIsLoading(false);
 }
 };

 // =====================================================
 // UI
 // =====================================================

 return (

 <div className="min-h-screen bg-gray-100 p-10">

 <div className="max-w-7xl mx-auto bg-white p-8 rounded-lg shadow-lg">

 <h1 className="text-3xl font-bold mb-8 text-center">
 Shipment Information Verification
 </h1>

 {/* TC */}
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

 {/* EWAY */}
 <div className="mb-6">

 <label className="block text-sm font-semibold mb-2">
 Upload E-Way Bill PDF
 </label>

 <input
 type="file"
 accept=".pdf"
 onChange={
 handleEwayBillChange
 }
 className="w-full border p-3 rounded"
 />
 </div>

 {/* BUTTON */}
 <button
 onClick={handleCompare}
 disabled={isLoading}
 className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded font-semibold"
 >
 {isLoading
 ? 'Processing PDFs...'
 : 'Compare Documents'}
 </button>

 {/* LOADING */}
 {isLoading && (
 <div className="mt-6 text-blue-600 font-semibold">
 OCR Processing...
 </div>
 )}

 {/* ERROR */}
 {error && (
 <div className="mt-6 bg-red-100 text-red-700 p-4 rounded">
 {error}
 </div>
 )}

 {/* RESULTS */}
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

 <tr key={field}>

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