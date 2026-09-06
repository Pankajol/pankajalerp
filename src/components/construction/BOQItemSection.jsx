"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import {
  FaTrash, FaPlus, FaSearch, FaTimes,
  FaBoxOpen, FaChevronUp, FaEdit
} from "react-icons/fa";

// ─── Helper: format currency ──────────────────────────────────────────────────
const formatCurrency = (num) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

// ─── Item Image Component ────────────────────────────────────────────────────
function ItemImage({ src, alt, className = "w-10 h-10" }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [src]);

  if (!src || err) {
    return (
      <div className={`${className} rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0`}>
        <FaBoxOpen className="text-gray-300 text-[10px]" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "Item"}
      className={`${className} object-cover rounded-md border border-gray-200 shrink-0`}
      onError={() => setErr(true)}
    />
  );
}

// ─── Portal: Search Dropdown ──────────────────────────────────────────────────
const SearchDropdownPortal = ({ isOpen, inputRect, items, onSelect, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || !inputRect) return null;

  const spaceBelow = window.innerHeight - inputRect.bottom;
  const listMaxH = Math.min(224, spaceBelow - 8);
  const top = listMaxH < 80
    ? inputRect.top - Math.min(224, inputRect.top - 8) - 4
    : inputRect.bottom + 4;

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className="fixed bg-white border border-gray-200 shadow-2xl rounded-xl z-[99999] overflow-y-auto"
      style={{ top, left: inputRect.left, width: inputRect.width, maxHeight: listMaxH }}
    >
      {items.map(itm => (
        <div
          key={itm._id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(itm); }}
          className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0"
        >
          <ItemImage src={itm.imageUrl} alt={itm.itemName} className="w-8 h-8" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-[11px] truncate">{itm.itemName}</p>
            <p className="text-[9px] text-gray-400 font-mono">{itm.itemCode}</p>
            {itm.variants && itm.variants.length > 0 && (
              <p className="text-[8px] text-indigo-400">{itm.variants.length} variants</p>
            )}
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
};

// ─── Portal: Variant Dropdown ──────────────────────────────────────────────────
const VariantPortal = ({ isOpen, buttonRect, variants, onSelect, onClose, itemImageUrl }) => {
  const [dropdownHeight, setDropdownHeight] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      setDropdownHeight(dropdownRef.current.clientHeight);
    }
  }, [isOpen, variants]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || !buttonRect) return null;

  const spaceBelow = window.innerHeight - buttonRect.bottom;
  const top = spaceBelow < dropdownHeight + 10
    ? buttonRect.top - dropdownHeight - 5
    : buttonRect.bottom + 5;

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 w-80 max-h-60 overflow-y-auto shadow-2xl rounded-xl z-[99999]"
      style={{ top: Math.max(5, top), left: buttonRect.left }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-600 bg-gray-50 border-b sticky top-0">Select variant</div>
      {variants.map(v => (
        <div
          key={v._id}
          onClick={() => { onSelect(v); onClose(); }}
          className="flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0"
        >
          <ItemImage src={v.imageUrl || itemImageUrl} alt={v.sku} className="w-8 h-8" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-[11px] truncate">{v.sku || 'Variant'}</p>
            {v.attributes && Object.keys(v.attributes).length > 0 && (
              <p className="text-[9px] text-gray-500 truncate">
                {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ')}
              </p>
            )}
          </div>
          <p className="text-[9px] font-mono text-indigo-600 whitespace-nowrap">₹{v.price ?? '—'}</p>
        </div>
      ))}
    </div>,
    document.body
  );
};

// ─── Main BOQ Item Section ──────────────────────────────────────────────────
const BOQItemSection = ({ items, onItemChange, onAddItem, onRemoveItem }) => {
  const [apiItems, setApiItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [activeSearchIdx, setActiveSearchIdx] = useState(null);
  const [searchInputRect, setSearchInputRect] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const [portalOpen, setPortalOpen] = useState(false);
  const [portalButtonRect, setPortalButtonRect] = useState(null);
  const [portalVariants, setPortalVariants] = useState([]);
  const [portalItemIndex, setPortalItemIndex] = useState(null);
  const [portalItemImageUrl, setPortalItemImageUrl] = useState("");

  const searchInputRefs = useRef({});
  const variantBtnRefs = useRef({});

  // Fetch inventory items
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        const res = await axios.get("/api/items?limit=1000", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data?.success ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setApiItems(data.map(it => ({ ...it, variants: it.variants || [] })));
      } catch (e) {
        console.error("[BOQItemSection] fetch error:", e);
      }
    })();
  }, []);

  const closeSearch = useCallback(() => {
    setActiveSearchIdx(null);
    setSearchInputRect(null);
    setFilteredItems([]);
  }, []);

  const handleNameSearch = (index, value) => {
    // Update the itemName field
    onItemChange(index, { itemName: value });

    if (!value) { closeSearch(); return; }

    const f = apiItems.filter(i =>
      (i.itemName || "").toLowerCase().includes(value.toLowerCase())
    );
    const inputEl = searchInputRefs.current[index];
    const rect = inputEl ? inputEl.getBoundingClientRect() : null;

    if (f.length) {
      setFilteredItems(f);
      setActiveSearchIdx(index);
      setSearchInputRect(rect);
    } else {
      closeSearch();
    }
  };

  // ✅ FIX: Single update with all fields
  const handleItemSelect = (index, selectedItem) => {
    const variants = selectedItem.variants || [];

    const row = {
      itemId: selectedItem._id,
      itemCode: selectedItem.itemCode || "",
      itemName: selectedItem.itemName || "",
      description: selectedItem.description || selectedItem.itemName || "",
      unit: selectedItem.uom || "nos",
      quantity: 1,
      rate: selectedItem.unitPrice || 0,
      amount: selectedItem.unitPrice || 0,
      imageUrl: selectedItem.imageUrl || "",
      isCustom: false,
    };

    // ✅ Single update call – parent will set all fields at once
    onItemChange(index, row);

    closeSearch();

    if (variants.length > 0) {
      setTimeout(() => {
        const btnEl = variantBtnRefs.current[index];
        const rect = btnEl
          ? btnEl.getBoundingClientRect()
          : searchInputRefs.current[index]?.getBoundingClientRect() || null;
        setPortalButtonRect(rect);
        setPortalVariants(variants);
        setPortalItemIndex(index);
        setPortalItemImageUrl(selectedItem.imageUrl || "");
        setPortalOpen(true);
      }, 80);
    }
  };

  const handleVariantSelect = (index, variant) => {
    const item = apiItems.find(i => i._id === items[index]?.itemId);
    if (!item) return;

    const rate = variant.price !== undefined && variant.price !== null
      ? variant.price
      : item.unitPrice || 0;

    const updatedRow = {
      ...items[index],
      itemCode: variant.sku || item.itemCode,
      itemName: variant.sku ? `${item.itemName} (${variant.sku})` : item.itemName,
      description: variant.attributes
        ? `${item.itemName} - ${Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}`
        : `${item.itemName} (${variant.sku || 'variant'})`,
      unit: variant.uom || item.uom || "nos",
      rate: rate,
      amount: (items[index]?.quantity || 1) * rate,
      imageUrl: variant.imageUrl || item.imageUrl,
      isCustom: false,
    };

    onItemChange(index, updatedRow);
    setPortalOpen(false);
  };

  const handleFieldChange = (index, field, value) => {
    const qty = parseFloat(value) || 0;
    const rate = parseFloat(items[index]?.rate) || 0;
    const amount = qty * rate;

    const updates = { [field]: value };
    if (field === "quantity") {
      updates.amount = amount;
    }
    onItemChange(index, updates);
  };

  const handleRateChange = (index, value) => {
    const rate = parseFloat(value) || 0;
    const qty = parseFloat(items[index]?.quantity) || 0;
    const amount = qty * rate;

    onItemChange(index, { rate, amount });
  };

  const toggleExpand = (index) => setExpandedRow(prev => prev === index ? null : index);

  const openVariantPortal = (e, variants, index, imageUrl) => {
    if (!variants.length) return;
    const rect = e?.currentTarget?.getBoundingClientRect()
      || variantBtnRefs.current[index]?.getBoundingClientRect()
      || null;
    setPortalButtonRect(rect);
    setPortalVariants(variants);
    setPortalItemIndex(index);
    setPortalItemImageUrl(imageUrl);
    setPortalOpen(true);
  };

  const inp = (ro = false) =>
    `w-full px-2 py-1.5 rounded-md border text-xs font-medium transition-all outline-none
     ${ro
       ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
       : "border-gray-200 bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 placeholder:text-gray-300"
     }`;

  const Lbl = ({ t }) => (
    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{t}</p>
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse text-xs">
            <thead>
              <tr className="bg-indigo-600">
                <th className="px-2 py-2.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap">#</th>
                <th className="px-2 py-2.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap">Image</th>
                <th className="px-2 py-2.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap">Item</th>
                <th className="px-2 py-2.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap">Description</th>
                <th className="px-2 py-2.5 text-center text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap">Unit</th>
                <th className="px-2 py-2.5 text-center text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap">Qty</th>
                <th className="px-2 py-2.5 text-center text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap">Rate (₹)</th>
                <th className="px-2 py-2.5 text-right text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap">Amount (₹)</th>
                <th className="px-2 py-2.5 text-center text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => {
                const isExpanded = expandedRow === index;
                const isEven = index % 2 === 0;
                const variants = apiItems.find(i => i._id === item.itemId)?.variants || [];

                return (
                  <React.Fragment key={index}>
                    <tr className={`${isEven ? "bg-white" : "bg-gray-50/40"} ${isExpanded ? "ring-2 ring-inset ring-indigo-300" : ""} hover:bg-indigo-50/20 transition-colors`}>
                      <td className="px-2 py-2 text-center">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-extrabold inline-flex items-center justify-center">
                          {index + 1}
                        </span>
                      </td>

                      <td className="px-1 py-1.5">
                        <ItemImage src={item.imageUrl} alt={item.itemName} className="w-10 h-10" />
                      </td>

                      <td className="px-1 py-1.5 min-w-[180px]">
                        <div className="relative">
                          <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-200 text-[8px] pointer-events-none z-10" />
                          <input
                            ref={el => { searchInputRefs.current[index] = el; }}
                            className={`${inp()} pl-5`}
                            type="text"
                            value={item.itemName ?? ""}
                            onChange={e => handleNameSearch(index, e.target.value)}
                            placeholder="Search item..."
                          />
                        </div>
                        {variants.length > 0 && (
                          <button
                            ref={el => { variantBtnRefs.current[index] = el; }}
                            type="button"
                            onClick={(e) => openVariantPortal(e, variants, index, item.imageUrl)}
                            className="mt-1 text-[9px] text-indigo-600 underline hover:text-indigo-800 flex items-center gap-1"
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            {item.isCustom ? "Select variant" : "Change variant"}
                          </button>
                        )}
                        {item.isCustom && (
                          <p className="text-[8px] text-amber-500 mt-0.5">Custom item</p>
                        )}
                      </td>

                      <td className="px-1 py-1.5 min-w-[150px]">
                        <input
                          className={inp()}
                          type="text"
                          value={item.description ?? ""}
                          onChange={e => onItemChange(index, { description: e.target.value })}
                          placeholder="Description..."
                        />
                      </td>

                      <td className="px-1 py-1.5">
                        <input
                          className={`${inp()} text-center`}
                          type="text"
                          value={item.unit ?? ""}
                          onChange={e => onItemChange(index, { unit: e.target.value })}
                          placeholder="nos"
                        />
                      </td>

                      <td className="px-1 py-1.5">
                        <input
                          className={`${inp()} text-center`}
                          type="number"
                          step="0.01"
                          value={item.quantity ?? 0}
                          onChange={e => handleFieldChange(index, "quantity", e.target.value)}
                          onFocus={e => e.target.select()}
                        />
                      </td>

                      <td className="px-1 py-1.5">
                        <input
                          className={`${inp()} text-center`}
                          type="number"
                          step="0.01"
                          value={item.rate ?? 0}
                          onChange={e => handleRateChange(index, e.target.value)}
                          onFocus={e => e.target.select()}
                        />
                      </td>

                      <td className="px-1 py-1.5">
                        <div className="px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-right whitespace-nowrap">
                          {formatCurrency(item.amount || 0)}
                        </div>
                      </td>

                      <td className="px-1 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(index)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isExpanded ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-400 hover:bg-indigo-500 hover:text-white"}`}
                          >
                            {isExpanded ? <FaChevronUp className="text-[8px]" /> : <FaEdit className="text-[8px]" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(index)}
                            className="w-6 h-6 rounded-md bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                          >
                            <FaTrash className="text-[8px]" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-0 border-t-0">
                          <div className="bg-indigo-50/30 border-t-2 border-indigo-200 px-4 py-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">{index + 1}</div>
                              <p className="text-xs font-bold text-indigo-700">{item.itemName || "Item details"}</p>
                              <button
                                type="button"
                                onClick={() => setExpandedRow(null)}
                                className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 font-medium transition-colors"
                              >
                                <FaChevronUp className="text-[8px]" /> Collapse
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <Lbl t="Item Code" />
                                <input
                                  className={inp()}
                                  type="text"
                                  value={item.itemCode ?? ""}
                                  onChange={e => onItemChange(index, { itemCode: e.target.value })}
                                  placeholder="Code"
                                />
                              </div>
                              <div>
                                <Lbl t="Unit" />
                                <input
                                  className={inp()}
                                  type="text"
                                  value={item.unit ?? ""}
                                  onChange={e => onItemChange(index, { unit: e.target.value })}
                                  placeholder="nos"
                                />
                              </div>
                              <div>
                                <Lbl t="Quantity" />
                                <input
                                  className={inp()}
                                  type="number"
                                  step="0.01"
                                  value={item.quantity ?? 0}
                                  onChange={e => handleFieldChange(index, "quantity", e.target.value)}
                                />
                              </div>
                              <div>
                                <Lbl t="Rate (₹)" />
                                <input
                                  className={inp()}
                                  type="number"
                                  step="0.01"
                                  value={item.rate ?? 0}
                                  onChange={e => handleRateChange(index, e.target.value)}
                                />
                              </div>
                            </div>

                            <div>
                              <Lbl t="Description" />
                              <input
                                className={inp()}
                                type="text"
                                value={item.description ?? ""}
                                onChange={e => onItemChange(index, { description: e.target.value })}
                                placeholder="Detailed description..."
                              />
                            </div>

                            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3">
                              <p className="text-[10px] font-bold text-emerald-700">Total Amount: {formatCurrency(item.amount || 0)}</p>
                              <p className="text-[9px] text-emerald-600">
                                = {item.quantity || 0} × {formatCurrency(item.rate || 0)}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="text-3xl opacity-20 mb-2">📦</div>
                    <p className="text-xs text-gray-300 font-medium">No items added yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        onClick={onAddItem}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-indigo-500 font-semibold text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all w-full justify-center"
      >
        <FaPlus className="text-xs" /> Add Item Row
      </button>

      <SearchDropdownPortal
        isOpen={activeSearchIdx !== null && filteredItems.length > 0}
        inputRect={searchInputRect}
        items={filteredItems}
        onSelect={(itm) => handleItemSelect(activeSearchIdx, itm)}
        onClose={closeSearch}
      />

      <VariantPortal
        isOpen={portalOpen}
        buttonRect={portalButtonRect}
        variants={portalVariants}
        onSelect={(variant) => handleVariantSelect(portalItemIndex, variant)}
        onClose={() => setPortalOpen(false)}
        itemImageUrl={portalItemImageUrl}
      />
    </div>
  );
};

BOQItemSection.propTypes = {
  items: PropTypes.array.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onAddItem: PropTypes.func,
  onRemoveItem: PropTypes.func,
};

export default BOQItemSection;