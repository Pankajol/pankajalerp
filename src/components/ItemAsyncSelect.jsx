// components/ItemAsyncSelect.js
import { useState, useCallback } from "react";
import AsyncSelect from "react-select/async";
import axios from "axios";
import debounce from "lodash/debounce";  // or write your own debounce

export default function ItemAsyncSelect({ value, onChange, placeholder = "Search item..." }) {
  const [token] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("token");
    return "";
  });

  const loadOptions = useCallback(
    debounce(async (inputValue, callback) => {
      if (!inputValue || inputValue.length < 1) {
        callback([]);
        return;
      }
      try {
        const res = await axios.get(`/api/items?search=${inputValue}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = res.data?.data || res.data || [];
        const options = items.map((item) => ({
          value: item._id,
          label: `${item.itemCode} – ${item.itemName}`,
          data: item,   // pass full item object if needed
        }));
        callback(options);
      } catch (err) {
        callback([]);
      }
    }, 400), // 400ms debounce
    [token]
  );

  // Handle default value display
  const selectedOption = value
    ? { value: value._id || value, label: value.itemCode ? `${value.itemCode} – ${value.itemName}` : value.label }
    : null;

  return (
    <AsyncSelect
      cacheOptions
      defaultOptions
      loadOptions={loadOptions}
      value={selectedOption}
      onChange={(opt) => onChange(opt)}
      placeholder={placeholder}
      isClearable
      className="text-sm"
    />
  );
}