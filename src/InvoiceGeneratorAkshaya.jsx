import React, { useState, useRef, useEffect } from "react";
import {
  Trash2,
  PlusCircle,
  Printer,
  Save,
  User,
  Smartphone,
  IndianRupee, // Using the requested IndianRupee icon
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { itemsList } from "../src/data/itemsList";
import { staffList as staffData } from "../src/data/staffList";
import CreatableSelect from "react-select/creatable";
import logo from "../src/assets/logo.png"; // UNCOMMENT and provide your logo image

// --- Reusable Utility Functions ---

const API_ENDPOINT =
  "https://script.google.com/macros/s/YOUR_INVOICE_DEPLOY_ID/exec";

const SHEETS_PROXY_URL =
  "https://script.google.com/macros/s/AKfycbz7rrGv93h4VlqSuISCm4QwzNMjCS07TrTrX4UKU8ai18U5uBx9ySlCJbB8TJY3NwB8/exec";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function uid() {
  return "id-" + Math.random().toString(36).slice(2, 10);
}
function generateBillNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const ms = String(d.getTime()).slice(-6);
  return `INV-${y}${m}${day}-${ms}`;
}

// --- Custom Status Modal Component ---

const StatusModal = ({ message, type, onClose }) => {
  const isSuccess = type === "success";
  const icon = isSuccess ? (
    <CheckCircle size={36} className="text-green-500" />
  ) : (
    <XCircle size={36} className="text-red-500" />
  );
  const title = isSuccess ? "Success!" : "Error!";
  const borderColor = isSuccess ? "border-green-400" : "border-red-400";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[100]">
      <div
        className={`bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm text-center border-t-8 ${borderColor} transition-all duration-300 transform scale-100`}
      >
        <div className="flex justify-center mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-3 text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">
          {message}
        </p>
        <button
          onClick={onClose}
          className={`w-full py-2 rounded-lg font-semibold text-white transition ${
            isSuccess
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          Close
        </button>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function InvoiceGeneratorAkshayaCentre() {
  const invoiceRef = useRef(null);

  const [billNumber, setBillNumber] = useState(generateBillNumber());
  const [date, setDate] = useState(todayISO());
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [note, setNote] = useState("");

  const [staffList, setStaffList] = useState([]);
  const [collectedById, setCollectedById] = useState("");
  const [collectedBy, setCollectedBy] = useState("");
  const [isStaffFromURL, setIsStaffFromURL] = useState(false);

  const [masterItems, setMasterItems] = useState([]);
  const [sending, setSending] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalType, setModalType] = useState("error"); // success or error

  const [items, setItems] = useState([
    {
      id: uid(),
      name: "",
      qty: 1,
      unitPrice: 0,
      discount: 0,
      discountType: "amount",
      price: 0,
      fromMaster: false,
    },
  ]);

  useEffect(() => {
    // Simulated fetching from data files
    setMasterItems(itemsList);
    setStaffList(staffData);

    // Auto-fill staff from URL if present
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("staffId");
    if (sid) {
      setCollectedById(sid);
      setIsStaffFromURL(true);
      const staff = staffData.find((s) => s.id === sid);
      if (staff) setCollectedBy(staff.name);
    }
  }, []);

  // Utility function to show the custom modal
  const showCustomModal = (type, message) => {
    setModalType(type);
    setModalContent(message);
    setShowModal(true);
  };

  function addItemRow() {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        name: "",
        qty: 1,
        unitPrice: 0,
        discount: 0,
        discountType: "amount",
        price: 0,
        fromMaster: false,
      },
    ]);
  }

  function removeItemRow(id) {
    setItems((s) => s.filter((it) => it.id !== id));
  }

  function updateItemRow(id, changes) {
    setItems((s) =>
      s.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...changes };
        // Ensure unitPrice and qty are treated as numbers, default to 0
        const raw = Number(updated.qty || 0) * Number(updated.unitPrice || 0);
        let finalDiscount = 0;

        // Calculate discount amount
        if (updated.discountType === "percent") {
          finalDiscount = (raw * Number(updated.discount || 0)) / 100;
        } else {
          finalDiscount = Number(updated.discount || 0);
        }

        // Final price must be non-negative
        updated.price = Math.max(0, raw - finalDiscount);
        return updated;
      })
    );
  }

  function onSelectItem(rowId, selectedOption) {
    if (!selectedOption) {
      updateItemRow(rowId, { name: "", unitPrice: 0, fromMaster: false });
      return;
    }

    const found = masterItems.find((x) => x.name === selectedOption.value);
    if (found) {
      // Item from master list
      updateItemRow(rowId, {
        name: found.name,
        unitPrice: found.unitPrice,
        discount: 0,
        fromMaster: true,
      });
    } else {
      // New custom item typed or selected
      updateItemRow(rowId, {
        name: selectedOption.value,
        unitPrice: 0,
        fromMaster: false,
      });
    }
  }

  const totals = (() => {
    const safeItems = items.map((it) => ({
      qty: Number(it.qty || 0),
      unitPrice: Number(it.unitPrice || 0),
      discount: Number(it.discount || 0),
      discountType: it.discountType,
      price: it.price,
    }));

    const subtotal = safeItems.reduce(
      (acc, it) => acc + it.qty * it.unitPrice,
      0
    );
    const totalDiscount = safeItems.reduce((acc, it) => {
      const raw = it.qty * it.unitPrice;
      if (it.discountType === "percent") return acc + (raw * it.discount) / 100;
      return acc + it.discount;
    }, 0);
    const totalAfter = safeItems.reduce((acc, it) => acc + it.price, 0);
    const totalDiscountPercent = (totalDiscount / subtotal) * 100 || 0;

    return {
      subtotal: subtotal,
      totalDiscount: totalDiscount,
      totalAfter: totalAfter,
      totalDiscountPercent: totalDiscountPercent,
    };
  })();

  // --- Common Validation Logic ---

  const validateInputs = (validItems) => {
    if (!customerName.trim()) {
      return "Customer Name is mandatory.";
    }
    if (!date) {
      return "Date is mandatory.";
    }
    if (!collectedBy || !collectedById) {
      return "Staff (Collected By) selection is mandatory.";
    }
    if (validItems.length === 0) {
      return "Please add at least one item with a positive price.";
    }
    return null; // Validation passed
  };

  // --- Save Logic ---

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);

    // 1. Filter and Validate Items
    const validItems = items.filter((it) => it.name && it.price > 0);
    const validationError = validateInputs(validItems);

    if (validationError) {
      setSending(false);
      showCustomModal("error", validationError);
      return;
    }

    // --- 2. Build and Format the Two-Sheet Payloads (Sheets API Row Format) ---

    // Bill Summary (Sheet 1: bill sheet)
    const billSummary = {
      billNumber,
      date,
      customerName,
      mobile,
      collectedBy,
      collectedById,
      note,
      subtotal: totals.subtotal.toFixed(2),
      totalDiscount: totals.totalDiscount.toFixed(2),
      totalAfter: totals.totalAfter.toFixed(2),
      itemCount: validItems.length,
      timestamp: new Date().toISOString(),
    };

    // Convert billSummary object into a single row array (required by Sheets API)
    // NOTE: Ensure the order of these properties matches the columns in your 'bill sheet'!
    const billSheetRows = [
      [
        billSummary.timestamp,
        billSummary.billNumber,
        billSummary.date,
        billSummary.customerName,
        billSummary.mobile,
        billSummary.collectedBy,
        billSummary.collectedById,
        billSummary.itemCount,
        billSummary.subtotal,
        billSummary.totalDiscount,
        billSummary.totalAfter,
        billSummary.note,
      ],
    ];

    // Billed Items (Sheet 2: billed items)
    // Convert array of item objects into an array of row arrays
    // NOTE: Ensure the order of these properties matches the columns in your 'billed items' sheet!
    const itemsSheetRows = validItems.map((item, index) => {
      // Calculate final discount amount for the sheet
      const discountValue =
        item.discountType === "amount"
          ? item.discount
          : (item.qty * item.unitPrice * item.discount) / 100;

      return [
        // Common Bill Data
        billNumber, // Key for linking to the bill summary
        billSummary.timestamp,
        billSummary.date,
        billSummary.collectedBy,
        // Item Specific Data
        index + 1,
        item.name,
        item.qty,
        item.unitPrice.toFixed(2),
        item.discount.toFixed(2),
        item.discountType,
        discountValue.toFixed(2),
        item.price.toFixed(2),
        item.fromMaster ? "Yes" : "No",
      ];
    });

    // Final payload structure for the proxy to split and save
    const payload = {
      action: "saveInvoice", // Tells the proxy what to do
      billData: billSheetRows, // Data for Sheet 1 (Bill Summary)
      itemsData: itemsSheetRows, // Data for Sheet 2 (Billed Items)
    };

    try {
      const res = await fetch(SHEETS_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || json.status !== "success") {
        throw new Error(
          json?.message || "Server responded with an error during save."
        );
      }

      // 3. Success Actions
      printInvoice(true); // Print after successful save
      showCustomModal(
        "success",
        `Invoice ${billNumber} saved successfully. Ready for the next bill.`
      );

      // Reset state for a new bill
      setBillNumber(generateBillNumber());
      setDate(todayISO());
      setItems([
        {
          id: uid(),
          name: "",
          qty: 1,
          unitPrice: 0,
          discount: 0,
          discountType: "amount",
          price: 0,
          fromMaster: false,
        },
      ]);
      setCustomerName("");
      setMobile("");
      setNote("");
    } catch (err) {
      showCustomModal("error", "Save Failed! " + err.message);
    } finally {
      setSending(false);
    }
  }

  // --- Print Logic ---

  function printInvoice(isPostSave = false) {
    const validItems = items.filter((it) => it.name && it.price > 0);
    const validationError = validateInputs(validItems);

    if (validationError && !isPostSave) {
      showCustomModal("error", validationError);
      return;
    }

    // If validation fails post-save, the print logic is skipped
    if (validationError && isPostSave) return;

    const markup = invoiceRef.current.innerHTML;

    // NOTE: The inline styles in the Print Markup are also updated
    // to include the zebra-striping and fix the discount symbol display.
    const styles = `
      <style>
        @page { size: A4; margin: 15mm; } 
        body { font-family: 'Inter', 'Helvetica Neue', Helvetica, sans-serif; color: #222; font-size: 10pt; line-height: 1.4; }
        .invoice-box { max-width: 190mm; margin: 0 auto; padding: 0; }
        
        /* Header */
        .header { text-align: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 5px; margin-bottom: 15px; }
        .header h1 { margin: 0; font-size: 20pt; color: #1d4ed8; font-weight: 700; }
        .header h2 { margin: 0; font-size: 9pt; color: #555; }
        .logo-print { max-height: 40px; margin: 0 auto 5px; display: block; }

        /* Invoice Details */
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 20px; border: 1px solid #eee; padding: 10px; border-radius: 5px; font-size: 9pt; }
        .details-left, .details-right { padding: 5px; }
        .details-right { text-align: right; }
        .details-grid strong { display: inline-block; width: 80px; font-weight: 600; }

        /* Table */
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9pt; }
        thead th { background-color: #eef2ff; color: #1d4ed8; font-weight: 700; padding: 8px 10px; border: 1px solid #ddd; border-bottom: 2px solid #1d4ed8; }
        tbody td { padding: 6px 10px; border: 1px solid #eee; }
        
        /* Totals */
        .totals-section { width: 300px; float: right; margin-top: 20px; }
        .totals-section div { display: flex; justify-content: space-between; padding: 4px 0; }
        .totals-section .final-total { font-size: 12pt; font-weight: 800; color: #1d4ed8; border-top: 2px solid #1d4ed8; padding-top: 8px; margin-top: 8px; }
        
        /* Footer/Notes */
        .note-section { margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px; clear: both; font-size: 9pt; }
        .footer { text-align: center; font-size: 7pt; color: #777; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; }
      </style>
    `;
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(
      `<html><head><title>Invoice ${billNumber}</title>${styles}</head><body>${markup}</body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Custom Modal Rendering */}
      {showModal && (
        <StatusModal
          message={modalContent}
          type={modalType}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-xl p-8 border border-gray-100">
        {/* Header Section */}
        <header className="flex justify-between items-start border-b border-gray-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <img src={logo} alt="Akshaya Logo" className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-blue-800 tracking-tight">
                Akshaya Centre
              </h1>
              <p className="text-xs text-gray-500 mt-0">
                Kolathur - Station Padi, Kerala
              </p>
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" /> Bill No:{" "}
              {billNumber}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <label className="text-sm text-gray-600">Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-gray-300 p-1.5 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              />
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer & Staff Info Card */}
          <div className="p-5 border border-blue-200 rounded-lg shadow-sm bg-white/80">
            <h2 className="text-base font-semibold text-blue-700 mb-3 flex items-center gap-1">
              <User size={18} /> Client & Staff Details
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-0.5">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="E.g., Anand Varma"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2 w-full text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-0.5">
                  Mobile Number
                </label>
                <input
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2 w-full text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              {/* Staff Info - Select Field */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-0.5">
                  Collected By <span className="text-red-500">*</span>
                </label>
                <select
                  value={collectedById}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setCollectedById(newId);
                    const staff = staffList.find((s) => s.id === newId);
                    setCollectedBy(staff ? staff.name : "");
                  }}
                  disabled={isStaffFromURL}
                  className={`border p-2 rounded-lg w-full text-sm ${
                    isStaffFromURL
                      ? "bg-gray-200 cursor-not-allowed text-gray-600"
                      : "bg-white border-gray-300"
                  } focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">-- Select staff --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {isStaffFromURL && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    Auto-filled: **{collectedBy || "N/A"}**
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Item Table */}
          <div className="border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-blue-600 text-white p-3 font-semibold text-base flex items-center gap-1">
              <IndianRupee size={18} /> Billable Items & Services
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-blue-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="p-3 text-left w-[40%]">Item Description</th>
                    <th className="p-3 text-center w-[10%]">Qty</th>
                    <th className="p-3 text-right w-[15%]">Unit Price (₹)</th>
                    <th className="p-3 text-center w-[15%]">Discount</th>
                    <th className="p-3 text-right w-[15%]">Total Price (₹)</th>
                    <th className="p-3 text-center w-[5%]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr
                      key={it.id}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } border-b border-gray-100 hover:bg-blue-50 transition`}
                    >
                      <td className="p-2.5">
                        <div className="flex flex-col">
                          <CreatableSelect
                            options={masterItems.map((i) => ({
                              label: i.name,
                              value: i.name,
                            }))}
                            isClearable
                            onChange={(opt) => {
                              onSelectItem(it.id, opt);
                              if (opt != null) {
                                // Add a new row when an item is selected/created
                                addItemRow();
                              }
                            }}
                            placeholder="Search or type item name..."
                            menuPortalTarget={document.body}
                            value={
                              it.name
                                ? { label: it.name, value: it.name }
                                : null
                            }
                            styles={{
                              control: (base) => ({
                                ...base,
                                minHeight: "36px",
                                fontSize: "0.85rem",
                                borderColor: it.fromMaster
                                  ? "#3b82f6"
                                  : "#f59e0b",
                                boxShadow: "none",
                              }),
                              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                              menu: (base) => ({ ...base, zIndex: 9999 }),
                            }}
                          />
                          {/* Restored Custom Item Hint */}
                          {/* {!it.fromMaster && it.name && (
                            <p className="text-xs text-orange-600 mt-1 font-medium italic">
                              Custom Item - Set Unit Price.
                            </p>
                          )} */}
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={it.qty}
                          onChange={(e) =>
                            updateItemRow(it.id, {
                              qty: Number(e.target.value),
                            })
                          }
                          className="border border-gray-300 p-1.5 rounded-lg text-xs w-16 text-center focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={it.unitPrice}
                          onChange={(e) =>
                            updateItemRow(it.id, {
                              unitPrice: Number(e.target.value),
                            })
                          }
                          className="border border-gray-300 p-1.5 rounded-lg text-xs w-20 text-right focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2.5 text-center flex justify-center gap-1 items-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={it.discount}
                          onChange={(e) =>
                            updateItemRow(it.id, {
                              discount: Number(e.target.value),
                            })
                          }
                          className="border border-gray-300 p-1.5 rounded-lg text-xs w-14 text-center focus:ring-blue-500 focus:border-blue-500"
                        />
                        <select
                          value={it.discountType}
                          onChange={(e) =>
                            updateItemRow(it.id, {
                              discountType: e.target.value,
                            })
                          }
                          className="border border-gray-300 p-1.5 rounded-lg text-xs h-8"
                        >
                          <option value="amount">₹</option>
                          <option value="percent">%</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-right font-bold text-base text-blue-700">
                        ₹{it.price.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(it.id)}
                          className="text-red-500 hover:text-red-700 transition p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t bg-gray-50">
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 text-blue-600 font-semibold text-sm hover:text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition"
              >
                <PlusCircle size={18} /> Add Item/Service
              </button>
            </div>
          </div>

          {/* Totals & Notes */}
          <div className="grid md:grid-cols-3 gap-6 pt-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional notes for the bill (e.g., service conditions, payment mode, warranty, etc.)"
              className="border border-gray-300 rounded-lg p-3 w-full md:col-span-2 h-28 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
            />

            <div className="p-3 bg-blue-50 rounded-lg shadow-inner">
              <div className="text-sm space-y-2 text-right">
                <div className="flex justify-between border-b border-blue-200 pb-1.5">
                  <span className="font-medium text-gray-700">Subtotal:</span>{" "}
                  <span className="font-semibold text-gray-800">
                    ₹{totals.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-blue-200">
                  <span className="font-medium">Discount:</span>
                  <span>
                    - ₹{totals.totalDiscount.toFixed(2)}
                    <span className="text-xs text-orange-600 ml-1">
                      ({totals.totalDiscountPercent.toFixed(2)}%)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-xl font-extrabold text-blue-700">
                  <span className="font-semibold text-gray-700 ">
                    TOTAL AMOUNT:
                  </span>
                  <span>₹{totals.totalAfter.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={() => printInvoice(false)}
              className="border border-blue-400 text-blue-600 px-5 py-2.5 rounded-lg hover:bg-blue-50 flex items-center gap-2 transition font-semibold text-sm shadow-md"
            >
              <Printer size={18} /> Print Preview (A4)
            </button>
            <button
              type="submit"
              disabled={sending}
              className="bg-blue-600 text-white px-7 py-2.5 rounded-lg shadow-lg shadow-blue-300 hover:bg-blue-700 transition transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2 font-semibold text-sm"
            >
              {sending ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} /> Save & Print Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Hidden A4 Print Markup (The Perfect PDF UI) */}
      <div ref={invoiceRef} style={{ display: "none" }}>
        <div className="invoice-box">
          <div className="header">
            <img src={logo} alt="Akshaya Logo" className="logo-print" />
            <h1>AKSHAYA CENTRE</h1>
            <h2>
              Kolathur - Station Padi | Ph: 9876543210 | GSTIN: XXXXXXXXXXXX
            </h2>
            <p
              style={{
                marginTop: "10px",
                fontWeight: "700",
                fontSize: "11pt",
                color: "#333",
              }}
            >
              TAX INVOICE
            </p>
          </div>

          <div className="details-grid">
            <div className="details-left">
              <div>
                <strong>Bill To:</strong> {customerName || "N/A"}
              </div>
              <div>
                <strong>Mobile:</strong> {mobile || "N/A"}
              </div>
              <div>
                <strong>Staff ID:</strong> {collectedById || "N/A"} (
                {collectedBy || "N/A"})
              </div>
            </div>
            <div className="details-right">
              <div>
                <strong>Invoice No:</strong> {billNumber}
              </div>
              <div>
                <strong>Date:</strong>{" "}
                {new Date(date).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div>
                <strong>Time:</strong>{" "}
                {new Date().toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: "5%", textAlign: "center" }}>#</th>
                <th style={{ width: "40%" }}>Item Description</th>
                <th style={{ width: "10%", textAlign: "center" }}>Qty</th>
                <th style={{ width: "15%", textAlign: "right" }}>
                  Unit Price (₹)
                </th>
                <th style={{ width: "15%", textAlign: "right" }}>Discount</th>
                <th style={{ width: "15%", textAlign: "right" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((it) => it.name && it.price > 0)
                .map((it, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 1 ? "#f8f9fa" : "white",
                    }} /* Zebra Striping */
                  >
                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                    <td>{it.name}</td>
                    <td style={{ textAlign: "center" }}>{it.qty}</td>
                    <td style={{ textAlign: "right" }}>
                      {it.unitPrice.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", color: "#d97706" }}>
                      {/* FIX: Correct Discount Display: amount value followed by ₹ or % */}
                      {it.discountType === "amount"
                        ? it.discount.toFixed(2) + "₹"
                        : it.discount.toFixed(2) + "%"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "600" }}>
                      {it.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="totals-section">
            <div>
              <span>Subtotal:</span>
              <span>{totals.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ color: "#d97706" }}>
              <span>Total Discount:</span>
              <span>- {totals.totalDiscount.toFixed(2)}</span>
            </div>
            <div className="final-total">
              <span>GRAND TOTAL:</span>
              <span>₹{totals.totalAfter.toFixed(2)}</span>
            </div>
          </div>

          {
            <div className="note-section">
              <strong>Notes:</strong> {note}
            </div>
          }

          <div
            style={{
              float: "right",
              marginTop: "40px",
              textAlign: "center",
              width: "200px",
              borderTop: "1px solid #222",
              padding: "5px",
            }}
          >
            <p style={{ margin: 0, fontWeight: "600" }}>Authorised Signature</p>
          </div>

          <div className="footer">
            <p>
              Thank you for choosing Akshaya Centre. We appreciate your
              business!
            </p>
            <p>
              This is a computer generated invoice and does not require a
              physical signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
