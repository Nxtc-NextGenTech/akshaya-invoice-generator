import React, { useState, useRef, useEffect } from "react";
import Select from "react-select";
import { Trash2, PlusCircle, Printer } from "lucide-react";
import { itemsList } from "../src/data/itemsList";
import { staffList as staffData } from "../src/data/staffList";

const API_ENDPOINT =
  "https://script.google.com/macros/s/YOUR_INVOICE_DEPLOY_ID/exec";

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
  return `AC-${y}${m}${day}-${ms}`;
}

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
    setMasterItems(itemsList);
    setStaffList(staffData);
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("staffId");
    if (sid) {
      setCollectedById(sid);
      setIsStaffFromURL(true);
      const staff = staffData.find((s) => s.id === sid);
      if (staff) setCollectedBy(staff.name);
    }
  }, []);

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
        const raw = Number(updated.qty || 0) * Number(updated.unitPrice || 0);
        let finalDiscount = 0;
        if (updated.discountType === "percent") {
          finalDiscount = (raw * Number(updated.discount || 0)) / 100;
        } else {
          finalDiscount = Number(updated.discount || 0);
        }
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
      updateItemRow(rowId, {
        name: found.name,
        unitPrice: found.unitPrice,
        fromMaster: true,
      });
    } else {
      updateItemRow(rowId, {
        name: selectedOption.value,
        unitPrice: 0,
        fromMaster: false,
      });
    }
  }

  const totals = (() => {
    const subtotal = items.reduce((acc, it) => acc + it.qty * it.unitPrice, 0);
    const totalDiscount = items.reduce((acc, it) => {
      const raw = it.qty * it.unitPrice;
      if (it.discountType === "percent") return acc + (raw * it.discount) / 100;
      return acc + it.discount;
    }, 0);
    const totalAfter = items.reduce((acc, it) => acc + it.price, 0);
    const totalDiscountPercent = (totalDiscount / subtotal) * 100 || 0;
    return { subtotal, totalDiscount, totalAfter, totalDiscountPercent };
  })();

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);

    const payload = {
      shopName: "Akshaya Centre, Kolathur - Station Padi",
      billNumber,
      date,
      customerName,
      mobile,
      collectedBy,
      collectedById,
      note,
      totals,
      items,
    };

    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success")
        throw new Error(json?.message || "Save failed");

      printInvoice();
      alert("✅ Invoice saved successfully!");
      setBillNumber(generateBillNumber());
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
      alert("❌ Error: " + err.message);
    } finally {
      setSending(false);
    }
  }

  function printInvoice() {
    const markup = invoiceRef.current.innerHTML;
    const styles = `
      <style>
        @page { margin: 15mm; }
        body { font-family: 'Poppins', sans-serif; color: #222; }
        .invoice-box { max-width: 800px; margin: auto; border: 1px solid #ddd; padding: 24px; border-radius: 10px; }
        .header { text-align: center; border-bottom: 2px solid #555; margin-bottom: 10px; padding-bottom: 10px; }
        .header h2 { margin: 0; font-size: 22px; color: #1d4ed8; }
        .info { margin: 8px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
        th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background-color: #f3f4f6; font-weight: 600; }
        .right { text-align: right; }
        .footer { text-align: center; font-size: 12px; color: #555; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
      </style>
    `;
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(
      `<html><head>${styles}</head><body>${markup}</body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-white py-10">
      <div className="max-w-5xl mx-auto bg-white/70 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-blue-100">
        <header className="flex justify-between items-center border-b pb-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-blue-700 tracking-tight">
              Akshaya Centre
            </h1>
            <p className="text-sm text-gray-600">Kolathur - Station Padi</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-800">Bill No: {billNumber}</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border p-1 rounded-md text-sm mt-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <div className="grid md:grid-cols-3 gap-4">
            <input
              placeholder="Customer Name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="border rounded-lg p-2 md:col-span-2 focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <input
              placeholder="Mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          {/* Staff Info */}
          <div>
            <label className="font-medium text-sm text-gray-700">
              Collected By
            </label>
            <select
              value={collectedById}
              onChange={(e) => setCollectedById(e.target.value)}
              disabled={isStaffFromURL}
              className={`border p-2 rounded w-full mt-1 ${
                isStaffFromURL ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            >
              <option value="">-- Select staff --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              className="border rounded p-2 mt-2 bg-gray-100 w-full"
              value={collectedBy}
              readOnly
            />
            {isStaffFromURL && (
              <p className="text-xs text-gray-500 mt-1">
                Auto-filled from staff ID in URL
              </p>
            )}
          </div>

          {/* Item Table */}
          <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="p-3 text-left w-2/6">Item</th>
                  <th className="p-3 text-center w-1/12">Qty</th>
                  <th className="p-3 text-center w-1/6">Unit Price</th>
                  <th className="p-3 text-center w-1/6">Discount</th>
                  <th className="p-3 text-right w-1/6">Price</th>
                  <th className="p-3 text-center w-1/12">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr
                    key={it.id}
                    className={`${
                      idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                    } hover:bg-blue-50 transition`}
                  >
                    <td className="p-2">
                      <Select
                        options={masterItems.map((i) => ({
                          label: i.name,
                          value: i.name,
                        }))}
                        isClearable
                        onChange={(opt) => onSelectItem(it.id, opt)}
                        placeholder="Select item"
                      />
                      {!it.fromMaster && (
                        <input
                          value={it.name}
                          onChange={(e) =>
                            updateItemRow(it.id, { name: e.target.value })
                          }
                          placeholder="Custom item name"
                          className="border p-1 rounded text-sm w-full mt-2"
                        />
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.qty}
                        onChange={(e) =>
                          updateItemRow(it.id, { qty: Number(e.target.value) })
                        }
                        className="border p-1 rounded text-sm w-16 text-center"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItemRow(it.id, {
                            unitPrice: Number(e.target.value),
                          })
                        }
                        className="border p-1 rounded text-sm w-24 text-center"
                      />
                    </td>
                    <td className="p-2 text-center flex justify-center gap-1">
                      <input
                        type="number"
                        value={it.discount}
                        onChange={(e) =>
                          updateItemRow(it.id, {
                            discount: Number(e.target.value),
                          })
                        }
                        className="border p-1 rounded text-sm w-16 text-center"
                      />
                      <select
                        value={it.discountType}
                        onChange={(e) =>
                          updateItemRow(it.id, { discountType: e.target.value })
                        }
                        className="border p-1 rounded text-xs"
                      >
                        <option value="amount">₹</option>
                        <option value="percent">%</option>
                      </select>
                    </td>
                    <td className="p-2 text-right font-semibold text-blue-700">
                      ₹{it.price.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(it.id)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addItemRow}
            className="flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700 mt-3"
          >
            <PlusCircle size={18} /> Add Item
          </button>

          {/* Totals */}
          <div className="border-t mt-6 pt-4 text-sm space-y-2 text-right">
            <div>
              <span className="font-medium">Subtotal:</span> ₹
              {totals.subtotal.toFixed(2)}
            </div>
            <div className="text-gray-600">
              Discount: ₹{totals.totalDiscount.toFixed(2)} (
              {totals.totalDiscountPercent.toFixed(2)}%)
            </div>
            <div className="text-lg font-semibold text-blue-700">
              Total: ₹{totals.totalAfter.toFixed(2)}
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Additional notes..."
            className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-400 outline-none"
          />

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              type="submit"
              disabled={sending}
              className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-2 rounded-lg shadow-md hover:scale-105 transition transform"
            >
              {sending ? "Saving..." : "💾 Save & Print"}
            </button>
            <button
              type="button"
              onClick={() => printInvoice()}
              className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-1 transition"
            >
              <Printer size={16} /> Print Preview
            </button>
          </div>
        </form>
      </div>

      {/* Hidden Print Markup */}
      <div ref={invoiceRef} style={{ display: "none" }}>
        <div className="invoice-box">
          <div className="header">
            <h2>Akshaya Centre</h2>
            <p>Kolathur - Station Padi</p>
          </div>
          <div className="info">
            <div>Date: {date}</div>
            <div>Bill No: {billNumber}</div>
            <div>Customer: {customerName}</div>
            <div>Mobile: {mobile}</div>
            <div>Collected By: {collectedBy}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{it.name}</td>
                  <td>{it.qty}</td>
                  <td>₹{it.unitPrice.toFixed(2)}</td>
                  <td>
                    {it.discount}
                    {it.discountType === "percent" ? "%" : "₹"}
                  </td>
                  <td className="right">₹{it.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="info right">
            <p>Subtotal: ₹{totals.subtotal.toFixed(2)}</p>
            <p>Discount: ₹{totals.totalDiscount.toFixed(2)}</p>
            <h3>Total: ₹{totals.totalAfter.toFixed(2)}</h3>
          </div>
          <div className="footer">Thank you for visiting Akshaya Centre!</div>
        </div>
      </div>
    </div>
  );
}
