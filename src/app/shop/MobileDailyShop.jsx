"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiBell, FiCalendar, FiCheck, FiChevronRight, FiClock, FiHome,
  FiLogOut, FiMapPin, FiMinus, FiPackage, FiPause, FiPlus,
  FiSearch, FiShoppingBag, FiTruck, FiUser, FiX,
} from "react-icons/fi";
import "./mobile-daily.css";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number(value || 0));
const dateKey = (value) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
}).format(value);
const dayLabel = (value, options = {}) => new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", ...options,
}).format(new Date(`${value}T12:00:00+05:30`));
const STATUS_LABELS = {
  confirmed: "Confirmed", processing: "Processing", packed: "Packed",
  shipped: "Shipped", out_for_delivery: "Out for delivery",
  delivered: "Delivered", cancelled: "Cancelled",
};
const WEEKDAYS = [
  [1, "M"], [2, "T"], [3, "W"], [4, "T"], [5, "F"], [6, "S"], [0, "S"],
];

function ItemImage({ item }) {
  const src = item?.image || item?.images?.[0] || item?.imageUrl;
  return src ? <img src={src} alt={item.name || "Product"} /> : <FiPackage />;
}

function SubscribeSheet({ product, token, onClose, onSaved, onLogin }) {
  const [quantity, setQuantity] = useState(1);
  const [frequency, setFrequency] = useState("daily");
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5, 6, 0]);
  const [timeSlot, setTimeSlot] = useState("6-8 AM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!token) { onClose(); onLogin(); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/mobile/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product._id, quantity, frequency, weekdays, timeSlot }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save daily plan");
      onSaved(data.message);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="daily-sheet-shade" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="daily-sheet">
        <button className="daily-sheet-close" onClick={onClose}><FiX /></button>
        <p className="daily-kicker">ADD TO DAILY PLAN</p>
        <div className="daily-sheet-product"><ItemImage item={product} /><div><h2>{product.name}</h2><p>{product.unit} · {money(product.storePrice)}</p></div></div>
        <label className="daily-field-label">Quantity per delivery</label>
        <div className="daily-big-quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><FiMinus /></button><b>{quantity}</b><button onClick={() => setQuantity(Math.min(99, quantity + 1))}><FiPlus /></button></div>
        <label className="daily-field-label">How often?</label>
        <div className="daily-segmented">{[["daily", "Every day"], ["alternate", "Alternate"], ["custom", "Custom"]].map(([value, label]) => <button key={value} className={frequency === value ? "active" : ""} onClick={() => setFrequency(value)}>{label}</button>)}</div>
        {frequency === "custom" && <div className="daily-weekday-picker">{WEEKDAYS.map(([value, label]) => <button key={value} className={weekdays.includes(value) ? "active" : ""} onClick={() => setWeekdays((current) => current.includes(value) ? current.filter((day) => day !== value) : [...current, value])}>{label}</button>)}</div>}
        <label className="daily-field-label">Delivery time</label>
        <select className="daily-select" value={timeSlot} onChange={(event) => setTimeSlot(event.target.value)}><option>6-8 AM</option><option>8-10 AM</option><option>5-7 PM</option></select>
        {error && <p className="daily-error">{error}</p>}
        <button className="daily-primary" disabled={busy || (frequency === "custom" && !weekdays.length)} onClick={save}>{busy ? "Saving…" : "Start daily delivery"}</button>
        <small className="daily-sheet-note">Pause, skip or change quantity anytime.</small>
      </div>
    </div>
  );
}

export default function MobileDailyShop({
  products, loading, storeError, user, token, storeName, cartCount, onLogin, onOpenCart,
  onOpenOrders, onAdd, onLogout, onUserUpdated,
}) {
  const [tab, setTab] = useState("home");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [plan, setPlan] = useState({ subscriptions: [], schedule: [], nextDelivery: null });
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [subscribeProduct, setSubscribeProduct] = useState(null);
  const [draftQty, setDraftQty] = useState({});
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [profileName, setProfileName] = useState(user?.fullName || "");
  const [addressForm, setAddressForm] = useState(null);

  useEffect(() => setProfileName(user?.fullName || ""), [user]);
  useEffect(() => {
    if (!token) { setPlan({ subscriptions: [], schedule: [], nextDelivery: null }); setOrders([]); setAddresses([]); return; }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/mobile/subscriptions", { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error("Daily plan unavailable"))),
      fetch("/api/mobile/orders", { headers }).then((response) => response.ok ? response.json() : { orders: [] }),
      fetch("/api/mobile/addresses", { headers }).then((response) => response.ok ? response.json() : { addresses: [] }),
    ]).then(([planData, orderData, addressData]) => {
      setPlan(planData); setOrders(orderData.orders || []); setAddresses(addressData.addresses || []);
      setDraftQty(Object.fromEntries((planData.subscriptions || []).map((item) => [item._id, item.quantity])));
    }).catch((error) => setNotice(error.message));
  }, [token, refresh]);

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 2600); return () => clearTimeout(timer); }, [notice]);

  const activeOrder = orders.find((order) => !["delivered", "cancelled"].includes(order.status));
  const nextItems = plan.nextDelivery?.items || [];
  const tomorrow = dateKey(new Date(Date.now() + 86400000));
  const activePlans = plan.subscriptions.filter((item) => item.status === "active");
  const planPaused = plan.subscriptions.length > 0 && activePlans.length === 0;
  const filteredProducts = useMemo(() => products.filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase())
  ), [products, search]);
  const recommended = filteredProducts.slice(0, search || showAll ? 12 : 4);

  const patchPlan = async (subscriptionId, payload) => {
    const response = await fetch("/api/mobile/subscriptions", {
      method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscriptionId, ...payload }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not update plan");
  };
  const saveQuantities = async () => {
    setBusy("quantity");
    try {
      await Promise.all(plan.subscriptions.filter((item) => draftQty[item._id] !== item.quantity).map((item) => patchPlan(item._id, { action: "update", quantity: draftQty[item._id] })));
      setNotice("Tomorrow's delivery updated"); setRefresh((value) => value + 1);
    } catch (error) { setNotice(error.message); } finally { setBusy(""); }
  };
  const skipTomorrow = async () => {
    if (!activePlans.length) return;
    setBusy("skip");
    const targetDate = plan.nextDelivery?.date || tomorrow;
    try { await Promise.all(activePlans.map((item) => patchPlan(item._id, { action: "skip", date: targetDate }))); setNotice(targetDate === tomorrow ? "Tomorrow's delivery skipped" : "Next delivery skipped"); setRefresh((value) => value + 1); }
    catch (error) { setNotice(error.message); } finally { setBusy(""); }
  };
  const toggleAllPlans = async () => {
    if (!plan.subscriptions.length) return;
    setBusy("pause");
    const action = planPaused ? "resume" : "pause";
    try { await Promise.all(plan.subscriptions.map((item) => patchPlan(item._id, { action }))); setNotice(planPaused ? "Daily plan resumed" : "Daily plan paused"); setRefresh((value) => value + 1); }
    catch (error) { setNotice(error.message); } finally { setBusy(""); }
  };
  const updateSinglePlan = async (item, values) => {
    setBusy(item._id);
    try { await patchPlan(item._id, { action: "update", ...values }); setNotice("Schedule updated"); setRefresh((value) => value + 1); }
    catch (error) { setNotice(error.message); } finally { setBusy(""); }
  };
  const saveProfile = async () => {
    if (profileName.trim().length < 2) return;
    setBusy("profile");
    try {
      const response = await fetch("/api/customers/profile", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ fullName: profileName.trim() }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.msg || "Could not update profile");
      onUserUpdated({ ...user, fullName: data.customer.customerName }); setNotice("Profile updated");
    } catch (error) { setNotice(error.message); } finally { setBusy(""); }
  };
  const saveAddress = async () => {
    setBusy("address");
    try {
      const response = await fetch("/api/mobile/addresses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(addressForm) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not save address");
      setAddressForm(null); setNotice("Address saved"); setRefresh((value) => value + 1);
    } catch (error) { setNotice(error.message); } finally { setBusy(""); }
  };
  const manageAddress = async (method, index) => {
    setBusy(`address-${index}`);
    try {
      const response = await fetch(
        method === "DELETE" ? `/api/mobile/addresses?index=${index}` : "/api/mobile/addresses",
        {
          method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          ...(method === "PATCH" ? { body: JSON.stringify({ index }) } : {}),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update address");
      setNotice(data.message); setRefresh((value) => value + 1);
    } catch (error) { setNotice(error.message); } finally { setBusy(""); }
  };

  const location = addresses[0] ? [addresses[0].city, addresses[0].state].filter(Boolean).join(", ") : "Add delivery address";
  const firstName = user?.fullName?.split(" ")[0] || "there";
  const deliveryDate = plan.nextDelivery?.date;
  const deliveryTime = plan.subscriptions.find((item) => item.status === "active")?.timeSlot || "6-8 AM";
  const hasChanges = plan.subscriptions.some((item) => draftQty[item._id] !== item.quantity);

  return (
    <div className="mobile-daily-app">
      <header className="daily-app-head">
        <div className="daily-wordmark"><span>P</span><div><b>{storeName}</b><small>Daily essentials</small></div></div>
        <div className="daily-head-actions"><button aria-label="Notifications"><FiBell /></button><button className="daily-bag" onClick={onOpenCart} aria-label="Cart"><FiShoppingBag />{cartCount > 0 && <i>{cartCount}</i>}</button><button className="daily-avatar" onClick={() => user ? setTab("profile") : onLogin()}>{user ? firstName[0]?.toUpperCase() : <FiUser />}</button></div>
      </header>

      {tab === "home" && <div className="daily-screen daily-home-screen">
        <section className="daily-welcome"><h1>{user ? `Good morning, ${firstName}` : "Fresh essentials, every day"}</h1><button onClick={() => user ? setTab("profile") : onLogin()}><FiMapPin /><span>{user ? location : "Sign in to choose your address"}</span><FiChevronRight /></button></section>
        <label className="daily-search"><FiSearch /><input value={search} onChange={(event) => { setSearch(event.target.value); setShowAll(false); }} placeholder="Search daily essentials" />{search && <button onClick={() => setSearch("")}><FiX /></button>}</label>

        {!user ? <section className="daily-login-card"><div><p className="daily-kicker">YOUR DAILY PLAN</p><h2>Morning essentials, automatically delivered.</h2><p>Sign in once to schedule milk, groceries and more.</p></div><button className="daily-primary" onClick={onLogin}>Sign in to continue</button></section>
        : nextItems.length ? <section className="tomorrow-card">
          <p>{deliveryDate === tomorrow ? "Tomorrow's delivery" : "Next delivery"}</p><h2>{dayLabel(deliveryDate, { weekday: "short", day: "numeric", month: "short" })} · {deliveryTime}</h2>
          <div className="tomorrow-lines">{nextItems.map((item) => <div key={item._id}><ItemImage item={item} /><span><b>{item.name}</b><small>{item.unit}</small><strong>{money(item.price)}</strong></span><div className="tomorrow-qty"><button onClick={() => setDraftQty((current) => ({ ...current, [item._id]: Math.max(1, (current[item._id] || item.quantity) - 1) }))}><FiMinus /></button><b>{draftQty[item._id] || item.quantity}</b><button onClick={() => setDraftQty((current) => ({ ...current, [item._id]: Math.min(99, (current[item._id] || item.quantity) + 1) }))}><FiPlus /></button></div></div>)}</div>
          <div className="tomorrow-total"><span>Total</span><b>{money(nextItems.reduce((sum, item) => sum + item.price * (draftQty[item._id] || item.quantity), 0))}</b></div>
          <button className="daily-primary" disabled={!hasChanges || busy === "quantity"} onClick={saveQuantities}>{busy === "quantity" ? "Saving…" : hasChanges ? "Save changes" : "Delivery is up to date"}</button>
          <div className="tomorrow-actions"><button disabled={!!busy} onClick={skipTomorrow}><FiCalendar />{busy === "skip" ? "Skipping…" : deliveryDate === tomorrow ? "Skip tomorrow" : "Skip next"}</button><button disabled={!!busy} onClick={toggleAllPlans}><FiPause />{planPaused ? "Resume plan" : "Pause plan"}<i className={planPaused ? "" : "on"}><span /></i></button></div>
        </section> : <section className="daily-empty-plan"><FiCalendar /><div><h2>No daily delivery yet</h2><p>Tap Subscribe on milk or any regular essential.</p></div></section>}

        {user && <button className="daily-plan-row" onClick={() => setTab("schedule")}><FiClock /><span><b>Daily plan</b><small>{plan.subscriptions.length ? `${plan.subscriptions.length} item${plan.subscriptions.length > 1 ? "s" : ""} scheduled` : "Set up your first delivery"}</small></span><strong>Edit schedule</strong><FiChevronRight /></button>}
        {activeOrder && <button className="daily-tracking-row" onClick={onOpenOrders}><FiTruck /><span><small>Order #{activeOrder.orderNumber}</small><b>{STATUS_LABELS[activeOrder.status] || "Confirmed"}</b></span><FiChevronRight /></button>}

        <section className="daily-recommendations"><div className="daily-section-title"><h2>{search ? `Results for “${search}”` : showAll ? "All essentials" : "You may also need"}</h2>{!search && products.length > 4 && <button onClick={() => setShowAll((value) => !value)}>{showAll ? "Show less" : "See all"} <FiChevronRight /></button>}</div>{loading ? <div className="daily-product-loading">Loading fresh products…</div> : storeError ? <div className="daily-product-loading"><FiPackage /><b>Store unavailable</b><span>{storeError}</span></div> : !recommended.length ? <div className="daily-product-loading"><FiSearch /><b>No products found</b><span>Try another product or category.</span></div> : <div className="daily-product-row">{recommended.map((product) => <article key={product._id}><div className="daily-product-image"><ItemImage item={product} /></div><h3>{product.name}</h3><p>{product.unit}</p><b>{money(product.storePrice)}</b><div><button disabled={!product.inStock} onClick={() => onAdd(product)}>{product.inStock ? "Add" : "Sold out"}</button><button disabled={!product.inStock} className="subscribe" onClick={() => setSubscribeProduct(product)}>Subscribe</button></div></article>)}</div>}</section>
      </div>}

      {tab === "schedule" && <div className="daily-screen daily-schedule-screen"><div className="daily-page-title"><p className="daily-kicker">RECURRING DELIVERIES</p><h1>My schedule</h1><p>Choose what arrives and on which days.</p></div>{!user ? <button className="daily-primary" onClick={onLogin}>Sign in to manage schedule</button> : plan.subscriptions.length ? <><div className="week-preview">{(plan.schedule || []).map((day, index) => <div key={day.date} className={index === 0 ? "today" : ""}><b>{dayLabel(day.date, { weekday: "short" })}</b><span>{dayLabel(day.date, { day: "numeric" })}</span><i>{day.items.length ? day.items.reduce((sum, item) => sum + item.quantity, 0) : "—"}</i></div>)}</div><div className="schedule-list">{plan.subscriptions.map((item) => <article key={item._id}><ItemImage item={item} /><div className="schedule-copy"><h3>{item.name}</h3><p>{item.quantity} {item.unit} · {item.timeSlot}</p><select value={item.frequency} disabled={busy === item._id} onChange={(event) => updateSinglePlan(item, { frequency: event.target.value, weekdays: event.target.value === "custom" ? (item.weekdays.length ? item.weekdays : [1, 2, 3, 4, 5]) : [] })}><option value="daily">Every day</option><option value="alternate">Alternate days</option><option value="custom">Selected days</option></select>{item.frequency === "custom" && <div className="schedule-days">{WEEKDAYS.map(([value, label]) => <button key={value} disabled={busy === item._id} className={item.weekdays.includes(value) ? "active" : ""} onClick={() => updateSinglePlan(item, { frequency: "custom", weekdays: item.weekdays.includes(value) ? item.weekdays.filter((day) => day !== value) : [...item.weekdays, value] })}>{label}</button>)}</div>}<div className="schedule-actions"><button className={`plan-state ${item.status}`} disabled={busy === item._id} onClick={async () => { setBusy(item._id); try { await patchPlan(item._id, { action: item.status === "paused" ? "resume" : "pause" }); setRefresh((value) => value + 1); } catch (error) { setNotice(error.message); } finally { setBusy(""); } }}>{item.status === "paused" ? "Resume" : "Pause"}</button><button disabled={busy === item._id} onClick={async () => { setBusy(item._id); try { await patchPlan(item._id, { action: "cancel" }); setNotice("Item removed from daily plan"); setRefresh((value) => value + 1); } catch (error) { setNotice(error.message); } finally { setBusy(""); } }}>Remove</button></div></div></article>)}</div></> : <div className="daily-zero"><FiCalendar /><h2>Your schedule is empty</h2><p>Subscribe to an item from Home to start.</p><button className="daily-primary" onClick={() => setTab("home")}>Browse essentials</button></div>}</div>}

      {tab === "profile" && <div className="daily-screen daily-profile-screen"><div className="profile-hero"><div className="profile-avatar">{firstName[0]?.toUpperCase()}</div><div><h1>{user?.fullName || "Your profile"}</h1><p>{user?.phone ? `+91 ${user.phone}` : storeName}</p></div></div>{!user ? <button className="daily-primary" onClick={onLogin}>Sign in to your account</button> : <><section className="profile-section"><h2>Personal details</h2><label>Full name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} /></label><button className="daily-secondary" disabled={busy === "profile" || profileName.trim() === user.fullName} onClick={saveProfile}>{busy === "profile" ? "Saving…" : "Save profile"}</button></section><section className="profile-section"><div className="profile-section-head"><h2>Delivery addresses</h2><button onClick={() => setAddressForm({ fullName: user.fullName, phone: user.phone || "", addressLine1: "", addressLine2: "", city: "", state: "", pincode: "", country: "India" })}>+ Add</button></div>{addresses.map((address, index) => <div className="profile-address" key={address._id}><FiMapPin /><span><b>{address.isDefault ? "Default address" : address.fullName}</b><small>{[address.addressLine1, address.city, address.state, address.pincode].filter(Boolean).join(", ")}</small><em>{!address.isDefault && <button disabled={busy === `address-${index}`} onClick={() => manageAddress("PATCH", index)}>Make default</button>}<button disabled={busy === `address-${index}`} onClick={() => manageAddress("DELETE", index)}>Remove</button></em></span>{address.isDefault && <i><FiCheck /></i>}</div>)}{addressForm && <div className="address-form"><button className="address-close" onClick={() => setAddressForm(null)}><FiX /></button><input placeholder="House / street" value={addressForm.addressLine1} onChange={(event) => setAddressForm({ ...addressForm, addressLine1: event.target.value })} /><input placeholder="Landmark (optional)" value={addressForm.addressLine2} onChange={(event) => setAddressForm({ ...addressForm, addressLine2: event.target.value })} /><div><input placeholder="City" value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} /><input placeholder="State" value={addressForm.state} onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })} /></div><input placeholder="6-digit PIN" maxLength={6} value={addressForm.pincode} onChange={(event) => setAddressForm({ ...addressForm, pincode: event.target.value.replace(/\D/g, "") })} /><button className="daily-primary" disabled={busy === "address" || !addressForm.addressLine1 || !addressForm.city || !addressForm.state || addressForm.pincode.length !== 6} onClick={saveAddress}>Save address</button></div>}</section><button className="profile-order-link" onClick={onOpenOrders}><FiPackage /><span><b>My orders</b><small>{orders.length} orders · Track, cancel and reorder</small></span><FiChevronRight /></button><button className="profile-logout" onClick={onLogout}><FiLogOut /> Log out</button></>}</div>}

      <nav className="daily-bottom-nav">{[["home", FiHome, "Home"], ["schedule", FiCalendar, "Schedule"], ["orders", FiPackage, "Orders"], ["profile", FiUser, "Profile"]].map(([value, Icon, label]) => <button key={value} className={tab === value ? "active" : ""} onClick={() => value === "orders" ? (user ? onOpenOrders() : onLogin()) : setTab(value)}><Icon /><span>{label}</span></button>)}</nav>
      {notice && <div className="daily-notice"><FiCheck />{notice}</div>}
      {subscribeProduct && <SubscribeSheet product={subscribeProduct} token={token} onLogin={onLogin} onClose={() => setSubscribeProduct(null)} onSaved={(message) => { setSubscribeProduct(null); setNotice(message); setRefresh((value) => value + 1); }} />}
    </div>
  );
}
