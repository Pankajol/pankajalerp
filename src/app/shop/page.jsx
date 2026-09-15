"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiArrowLeft,
  FiArrowRight,
  FiArrowUpRight,
  FiBox,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiGrid,
  FiHeart,
  FiList,
  FiLock,
  FiMenu,
  FiMapPin,
  FiMinus,
  FiPackage,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiShoppingBag,
  FiShoppingCart,
  FiStar,
  FiTrash2,
  FiTruck,
  FiUser,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import "./shop.css";
import MobileDailyShop from "./MobileDailyShop";

const CART_KEY = "pankajal_shop_cart";
const TOKEN_KEY = "pankajal_customer_token";
const USER_KEY = "pankajal_customer_user";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const safeRead = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const orderStatus = {
  confirmed: { label: "Confirmed", tone: "blue" },
  processing: { label: "Processing", tone: "amber" },
  packed: { label: "Packed", tone: "violet" },
  shipped: { label: "Shipped", tone: "violet" },
  out_for_delivery: { label: "Out for delivery", tone: "amber" },
  delivered: { label: "Delivered", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
};

const shortDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";

const normalizeApiItem = (item) => {
  if (item.name && item.storePrice !== undefined) return item;
  const price = Number(item.salesPrice ?? item.unitPrice ?? 0);
  const mrp = Number(item.mrp || price);
  return {
    ...item,
    slug: item.itemCode,
    name: item.itemName,
    category: item.itemGroup || item.category || "General",
    storePrice: price,
    mrp,
    discount: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
    images: item.images?.length
      ? item.images
      : item.imageUrl
      ? [item.imageUrl]
      : [],
    stockQty: Number(item.stockQuantity ?? item.quantity ?? 0),
    inStock:
      item.inStock !== false &&
      Number(item.stockQuantity ?? item.quantity ?? 0) > 0,
    unit: item.uom || item.stockUom || "piece",
  };
};

function ProductArt({ product, large = false }) {
  if (!product)
    return (
      <div
        className={`product-art catalog-placeholder ${large ? "large" : ""}`}
      >
        <FiPackage />
        <small>YOUR CATALOG</small>
      </div>
    );
  const image = product.images?.[0] || product.imageUrl;
  if (image)
    return (
      <img
        src={image}
        alt={product.name}
        className={`product-image ${large ? "large" : ""}`}
      />
    );
  return (
    <div
      className={`product-art ${large ? "large" : ""}`}
      style={{
        "--art-bg": product.color || "#e7e5e4",
        "--art-accent": product.accent || "#78716c",
      }}
    >
      <div className="fabric-roll">
        <span />
        <span />
        <span />
      </div>
      <small>{product.category}</small>
    </div>
  );
}

function Quantity({ value, onChange, max = 99 }) {
  return (
    <div className="qty-control">
      <button
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <FiMinus />
      </button>
      <span>{value}</span>
      <button
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max || 99, value + 1))}
      >
        <FiPlus />
      </button>
    </div>
  );
}

function AuthModal({ open, onClose, companySlug, onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    password: "",
    otp: "",
    companySlug: companySlug || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");

  useEffect(
    () => setForm((f) => ({ ...f, companySlug: companySlug || f.companySlug })),
    [companySlug]
  );
  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.companySlug.trim())
      return setError("Enter the store code supplied by the seller.");
    if (!/^\d{10}$/.test(form.phone))
      return setError("Enter a valid 10-digit mobile number.");
    if (form.password.length < 6)
      return setError("Password must contain at least 6 characters.");
    setBusy(true);
    try {
      const endpoint =
        mode === "login" ? "/api/mobile/login" : "/api/mobile/register";
      const payload =
        mode === "login"
          ? {
              phone: form.phone,
              password: form.password,
              companySlug: form.companySlug,
            }
          : {
              fullName: form.fullName,
              phone: form.phone,
              password: form.password,
              companySlug: form.companySlug,
            };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to continue");
      if (mode === "signup") {
        setDevOtp(data.devOtp || "");
        setStep("otp");
      } else onAuthenticated(data.authToken, data.user, form.companySlug);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/mobile/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone,
          otp: form.otp,
          companySlug: form.companySlug,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "OTP verification failed");
      onAuthenticated(data.authToken, data.user, form.companySlug);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="auth-modal"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
      >
        <button className="icon-button modal-close" onClick={onClose}>
          <FiX />
        </button>
        {step === "otp" ? (
          <>
            <div className="auth-icon">
              <FiShield />
            </div>
            <p className="eyebrow">ONE LAST STEP</p>
            <h2>Verify your mobile</h2>
            <p className="muted center">
              Enter the 6-digit code sent to +91 {form.phone}.
            </p>
            <form onSubmit={verify} className="auth-form">
              <label>
                Verification code
                <input
                  className="otp-input"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.otp}
                  onChange={(e) =>
                    setForm({ ...form, otp: e.target.value.replace(/\D/g, "") })
                  }
                  placeholder="000000"
                  autoFocus
                />
              </label>
              {devOtp && (
                <button
                  type="button"
                  className="dev-otp"
                  onClick={() => setForm({ ...form, otp: devOtp })}
                >
                  Development OTP: <b>{devOtp}</b> — tap to fill
                </button>
              )}
              {error && <p className="form-error">{error}</p>}
              <button
                className="primary-button wide"
                disabled={busy || form.otp.length !== 6}
              >
                {busy ? "Verifying…" : "Verify & start shopping"}
                <FiArrowRight />
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Log in
              </button>
              <button
                className={mode === "signup" ? "active" : ""}
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
              >
                Create account
              </button>
            </div>
            <p className="eyebrow">CUSTOMER ACCOUNT</p>
            <h2>{mode === "login" ? "Welcome back" : "Join the store"}</h2>
            <p className="muted">
              {mode === "login"
                ? "Log in for a faster checkout and order history."
                : "Sign up once, then shop and track every order easily."}
            </p>
            <form onSubmit={submit} className="auth-form">
              {mode === "signup" && (
                <label>
                  Full name
                  <input
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    placeholder="Your full name"
                    required
                  />
                </label>
              )}
              <label>
                Mobile number
                <div className="phone-field">
                  <span>+91</span>
                  <input
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="98765 43210"
                    required
                  />
                </div>
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Minimum 6 characters"
                  required
                />
              </label>
              <label>
                Store code
                <input
                  value={form.companySlug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      companySlug: e.target.value.toLowerCase().trim(),
                    })
                  }
                  placeholder="Seller's company code"
                  required
                />
                <small>
                  Tip: open the seller's Shop Now link to fill this
                  automatically.
                </small>
              </label>
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button wide" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : mode === "login"
                  ? "Log in securely"
                  : "Create customer account"}
                <FiArrowRight />
              </button>
            </form>
          </>
        )}
        <div className="secure-note">
          <FiLock /> Your details are securely encrypted
        </div>
      </motion.div>
    </div>
  );
}

function DetailsModal({ product, onClose, onAdd, onBuy }) {
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState(product.variants?.[0] || null);
  const price = variant?.storePrice ?? product.storePrice;
  return (
    <div
      className="modal-backdrop product-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="product-modal"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <button className="icon-button modal-close" onClick={onClose}>
          <FiX />
        </button>
        <div className="detail-art">
          <ProductArt product={product} large />
          {product.discount > 0 && (
            <span className="discount-badge">Save {product.discount}%</span>
          )}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h2>{product.name}</h2>
          <div className="rating">
            <span>
              <FiStar /> 4.8
            </span>
            <span>124 verified reviews</span>
            <span className="stock-dot">In stock</span>
          </div>
          <p className="detail-description">
            {product.description ||
              "A thoughtfully selected product made for quality, comfort and everyday value."}
          </p>
          {product.variants?.length > 0 && (
            <div className="variant-section">
              <label>{product.variantType || "Choose option"}</label>
              <div>
                {product.variants.map((v) => (
                  <button
                    key={v._id || v.label}
                    className={variant?._id === v._id ? "active" : ""}
                    onClick={() => setVariant(v)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="price-row">
            <strong>{money(price)}</strong>
            {product.mrp > price && <del>{money(product.mrp)}</del>}
            <small>Inclusive of all taxes</small>
          </div>
          <div className="detail-features">
            {(product.tags?.length
              ? product.tags
              : ["Quality checked", "Secure packaging", "Easy support"]
            )
              .slice(0, 3)
              .map((tag) => (
                <span key={tag}>
                  <FiCheck />
                  {tag}
                </span>
              ))}
          </div>
          {product.specifications?.length > 0 && (
            <div className="spec-list">
              {product.specifications.slice(0, 4).map((s) => (
                <div key={s.key}>
                  <span>{s.key}</span>
                  <b>{s.value}</b>
                </div>
              ))}
            </div>
          )}
          <div className="detail-actions">
            <Quantity value={qty} onChange={setQty} max={product.stockQty} />
            <button
              className="secondary-button"
              onClick={() => onAdd(product, qty, variant)}
            >
              <FiShoppingCart /> Add to cart
            </button>
            <button
              className="primary-button"
              onClick={() => onBuy(product, qty, variant)}
            >
              Buy now <FiArrowRight />
            </button>
          </div>
          <div className="delivery-strip">
            <span>
              <FiTruck /> Fast dispatch
            </span>
            <span>
              <FiShield /> Secure checkout
            </span>
            <span>
              <FiPackage /> Easy support
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CartDrawer({ open, cart, onClose, onQty, onRemove, onCheckout }) {
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="drawer-shade"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="cart-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              <div className="drawer-head">
                <div>
                  <p className="eyebrow">YOUR SELECTION</p>
                  <h2>
                    Shopping bag{" "}
                    <span>{cart.reduce((s, i) => s + i.qty, 0)}</span>
                  </h2>
                </div>
                <button className="icon-button" onClick={onClose}>
                  <FiX />
                </button>
              </div>
              <div className="cart-lines">
                {cart.length === 0 ? (
                  <div className="empty-cart">
                    <div>
                      <FiShoppingBag />
                    </div>
                    <h3>Your bag is waiting</h3>
                    <p>Add something you love and it will appear here.</p>
                    <button className="secondary-button" onClick={onClose}>
                      Continue shopping
                    </button>
                  </div>
                ) : (
                  cart.map((line) => (
                    <div className="cart-line" key={line.key}>
                      <ProductArt product={line.product} />
                      <div className="cart-line-info">
                        <h3>{line.product.name}</h3>
                        <p>{line.variant?.label || line.product.category}</p>
                        <b>{money(line.price)}</b>
                        <Quantity
                          value={line.qty}
                          onChange={(q) => onQty(line.key, q)}
                          max={line.product.stockQty}
                        />
                      </div>
                      <button
                        className="remove-button"
                        onClick={() => onRemove(line.key)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))
                )}
              </div>
              {cart.length > 0 && (
                <div className="cart-summary">
                  <div>
                    <span>Subtotal</span>
                    <b>{money(subtotal)}</b>
                  </div>
                  <p>Shipping and taxes calculated at checkout.</p>
                  <button className="primary-button wide" onClick={onCheckout}>
                    Secure checkout <FiArrowRight />
                  </button>
                  <button className="text-button" onClick={onClose}>
                    Continue shopping
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function CheckoutModal({ cart, user, token, onClose, onSuccess }) {
  const [address, setAddress] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  const [payment, setPayment] = useState("cod");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const delivery = subtotal >= 999 ? 0 : 79;

  useEffect(() => {
    if (!token) return;
    fetch("/api/mobile/addresses", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.addresses?.[0]) setAddress(data.addresses[0]);
      })
      .catch(() => {});
  }, [token]);
  const placeOrder = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(address.pincode))
      return setError("Enter a valid 6-digit PIN code.");
    setBusy(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      await fetch("/api/mobile/addresses", {
        method: "POST",
        headers,
        body: JSON.stringify(address),
      });
      const response = await fetch("/api/mobile/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          paymentMethod: payment,
          shippingAddress: address,
          items: cart.map((line) => ({
            productId: line.product._id,
            name: line.product.name,
            image: line.product.images?.[0] || "",
            qty: line.qty,
            price: line.price,
            variantId: line.variant?._id,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Could not place order");
      onSuccess(data.order?.orderNumber || data.order?._id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop checkout-backdrop">
      <motion.div
        className="checkout-modal"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="checkout-head">
          <div>
            <p className="eyebrow">SECURE CHECKOUT</p>
            <h2>Where should we deliver?</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <div className="checkout-grid">
          <form
            id="checkout-form"
            onSubmit={placeOrder}
            className="checkout-form"
          >
            <div className="checkout-section">
              <h3>
                <span>1</span> Contact & delivery
              </h3>
              <div className="field-grid">
                <label>
                  Full name
                  <input
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress({ ...address, fullName: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Mobile number
                  <input
                    value={address.phone}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    maxLength={10}
                    required
                  />
                </label>
                <label className="full">
                  Address
                  <input
                    value={address.addressLine1}
                    onChange={(e) =>
                      setAddress({ ...address, addressLine1: e.target.value })
                    }
                    placeholder="House / flat, building and street"
                    required
                  />
                </label>
                <label className="full">
                  Landmark (optional)
                  <input
                    value={address.addressLine2}
                    onChange={(e) =>
                      setAddress({ ...address, addressLine2: e.target.value })
                    }
                  />
                </label>
                <label>
                  City
                  <input
                    value={address.city}
                    onChange={(e) =>
                      setAddress({ ...address, city: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  State
                  <input
                    value={address.state}
                    onChange={(e) =>
                      setAddress({ ...address, state: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  PIN code
                  <input
                    value={address.pincode}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        pincode: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    maxLength={6}
                    required
                  />
                </label>
              </div>
            </div>
            <div className="checkout-section">
              <h3>
                <span>2</span> Payment method
              </h3>
              <div className="payment-options">
                {[
                  ["cod", "Cash on delivery", "Pay when your order arrives"],
                  [
                    "upi",
                    "UPI on confirmation",
                    "Receive a secure payment request",
                  ],
                  [
                    "card",
                    "Card on confirmation",
                    "Pay through the secure payment link",
                  ],
                ].map(([id, title, sub]) => (
                  <label className={payment === id ? "active" : ""} key={id}>
                    <input
                      type="radio"
                      name="payment"
                      value={id}
                      checked={payment === id}
                      onChange={() => setPayment(id)}
                    />
                    <i>{payment === id && <FiCheck />}</i>
                    <span>
                      <b>{title}</b>
                      <small>{sub}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
          </form>
          <aside className="order-card">
            <h3>Order summary</h3>
            {cart.map((line) => (
              <div className="summary-line" key={line.key}>
                <ProductArt product={line.product} />
                <span>
                  <b>{line.product.name}</b>
                  <small>Qty {line.qty}</small>
                </span>
                <strong>{money(line.price * line.qty)}</strong>
              </div>
            ))}
            <div className="totals">
              <p>
                <span>Subtotal</span>
                <b>{money(subtotal)}</b>
              </p>
              <p>
                <span>Delivery</span>
                <b className={delivery === 0 ? "free" : ""}>
                  {delivery === 0 ? "FREE" : money(delivery)}
                </b>
              </p>
              <p className="grand">
                <span>Total</span>
                <b>{money(subtotal + delivery)}</b>
              </p>
            </div>
            <button
              form="checkout-form"
              className="primary-button wide"
              disabled={busy}
            >
              {busy ? "Placing order…" : "Place order"}
              <FiLock />
            </button>
            <p className="safe-copy">
              <FiShield />
              Protected checkout · No card data stored
            </p>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

function OrdersModal({ open, token, onClose, onShop }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!open || !token) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/mobile/orders", {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load orders");
        setOrders(data.orders || []);
        setSelected((current) => current ? (data.orders || []).find((order) => order._id === current._id) || current : null);
      })
      .catch((err) => err.name !== "AbortError" && setError(err.message))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [open, token, refresh]);

  useEffect(() => {
    if (!open || !token) return;
    const timer = setInterval(() => setRefresh((value) => value + 1), 15000);
    return () => clearInterval(timer);
  }, [open, token]);

  if (!open) return null;

  const today = new Date().toDateString();
  const isActive = (status) =>
    !["delivered", "cancelled"].includes(status);
  const visibleOrders = orders.filter((order) => {
    if (filter === "active") return isActive(order.status);
    if (filter === "delivered") return order.status === "delivered";
    if (filter === "cancelled") return order.status === "cancelled";
    return true;
  });
  const groups = visibleOrders.reduce((result, order) => {
    const key = new Date(order.placedAt).toDateString() === today ? "Today" : "Previous orders";
    (result[key] ||= []).push(order);
    return result;
  }, {});

  const cancelOrder = async () => {
    if (!selected || cancelReason.trim().length < 3) return;
    setCancelling(true);
    setError("");
    try {
      const response = await fetch(`/api/mobile/orders/${selected._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "cancel", reason: cancelReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to cancel order");
      setOrders((current) =>
        current.map((order) => (order._id === selected._id ? data.order : order))
      );
      setSelected(data.order);
      setCancelReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="modal-backdrop orders-backdrop">
      <motion.div
        className="orders-modal"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="orders-head">
          <div>
            <p className="eyebrow">YOUR PURCHASES</p>
            <h2>My orders</h2>
            <p>Track delivery, review details or cancel an eligible order.</p>
          </div>
          <div className="orders-head-actions">
            <button className="icon-button" onClick={() => setRefresh((v) => v + 1)} aria-label="Refresh orders">
              <FiRefreshCw />
            </button>
            <button className="icon-button" onClick={onClose} aria-label="Close orders">
              <FiX />
            </button>
          </div>
        </div>

        <div className="order-stats">
          <div><strong>{orders.filter((o) => new Date(o.placedAt).toDateString() === today).length}</strong><span>Today</span></div>
          <div><strong>{orders.filter((o) => isActive(o.status)).length}</strong><span>Active</span></div>
          <div><strong>{orders.filter((o) => o.status === "delivered").length}</strong><span>Delivered</span></div>
        </div>

        <div className="order-filters">
          {["all", "active", "delivered", "cancelled"].map((value) => (
            <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>

        {error && <p className="form-error order-error">{error}</p>}
        <div className="orders-body">
          <div className="orders-list">
            {loading ? (
              <div className="orders-empty"><FiRefreshCw className="spin" /><p>Loading your orders…</p></div>
            ) : visibleOrders.length === 0 ? (
              <div className="orders-empty">
                <FiShoppingBag />
                <h3>No orders here yet</h3>
                <p>Your orders will appear here after checkout.</p>
                <button className="primary-button" onClick={onShop}>Start shopping</button>
              </div>
            ) : (
              Object.entries(groups).map(([label, group]) => (
                <section className="order-day-group" key={label}>
                  <h3>{label} <span>{group.length}</span></h3>
                  {group.map((order) => {
                    const status = orderStatus[order.status] || orderStatus.confirmed;
                    return (
                      <button
                        className={`order-row ${selected?._id === order._id ? "selected" : ""}`}
                        key={order._id}
                        onClick={() => { setSelected(order); setCancelReason(""); setError(""); }}
                      >
                        <div className="order-row-top">
                          <b>#{order.orderNumber}</b>
                          <span className={`order-status ${status.tone}`}>{status.label}</span>
                        </div>
                        <div className="order-row-bottom">
                          <span>{order.items.length} item{order.items.length === 1 ? "" : "s"} · {shortDate(order.placedAt)}</span>
                          <strong>{money(order.totalAmount)}</strong>
                        </div>
                      </button>
                    );
                  })}
                </section>
              ))
            )}
          </div>

          <aside className={`order-detail ${selected ? "open" : ""}`}>
            {selected ? (
              <>
                <button className="order-detail-close" onClick={() => setSelected(null)}><FiX /></button>
                <p className="eyebrow">ORDER DETAILS</p>
                <h3>#{selected.orderNumber}</h3>
                <div className="delivery-progress">
                  {["confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"].map((step, index, steps) => {
                    const currentIndex = steps.indexOf(selected.status);
                    const done = selected.status !== "cancelled" && index <= currentIndex;
                    return <i key={step} className={done ? "done" : ""} />;
                  })}
                </div>
                <div className="delivery-message">
                  {selected.status === "cancelled" ? <FiXCircle /> : <FiTruck />}
                  <span>
                    <b>{(orderStatus[selected.status] || orderStatus.confirmed).label}</b>
                    <small>
                      {selected.status === "cancelled"
                        ? selected.cancellationReason || "This order was cancelled"
                        : selected.estimatedDelivery
                        ? `Expected by ${shortDate(selected.estimatedDelivery)}`
                        : "Delivery date will be updated soon"}
                    </small>
                  </span>
                </div>
                {selected.deliveryPartner && (
                  <div className="delivery-partner-card">
                    <div className="delivery-partner-avatar"><FiUser /></div>
                    <span><small>Your delivery partner</small><b>{selected.deliveryPartner.name}</b><em>{selected.deliveryPartner.vehicleNumber || "On the way"}</em></span>
                    {selected.deliveryPartner.phone && <a href={`tel:${selected.deliveryPartner.phone}`} aria-label="Call delivery partner"><FiPhone /></a>}
                  </div>
                )}
                {selected.deliveryOtp && <div className="delivery-otp"><span><small>Share only after receiving your order</small><b>Delivery OTP</b></span><strong>{selected.deliveryOtp}</strong></div>}
                {selected.statusHistory?.length > 0 && <div className="order-timeline"><h4>Order journey</h4>{[...selected.statusHistory].reverse().map((event, index) => <div key={`${event.status}-${event.changedAt}-${index}`}><i className={index === 0 ? "current" : ""} /><span><b>{String(event.status).replaceAll("_", " ")}</b><small>{event.note}{event.changedAt ? ` · ${shortDate(event.changedAt)}` : ""}</small></span></div>)}</div>}
                {(selected.trackingNumber || selected.courierName) && (
                  <div className="tracking-box">
                    <span>Courier <b>{selected.courierName || "Assigned"}</b></span>
                    <span>Tracking ID <b>{selected.trackingNumber || "Pending"}</b></span>
                  </div>
                )}
                <div className="order-items-detail">
                  {selected.items.map((item, index) => (
                    <div key={`${item.productId}-${index}`}>
                      {item.image ? <img src={item.image} alt="" /> : <FiPackage />}
                      <span><b>{item.name}</b><small>{item.quantity} × {money(item.price)}</small></span>
                      <strong>{money(item.quantity * item.price)}</strong>
                    </div>
                  ))}
                </div>
                <div className="order-price-detail">
                  <p><span>Subtotal</span><b>{money(selected.subtotal)}</b></p>
                  <p><span>Delivery</span><b>{selected.deliveryCharge ? money(selected.deliveryCharge) : "FREE"}</b></p>
                  <p><span>Total</span><b>{money(selected.totalAmount)}</b></p>
                </div>
                <div className="delivery-address">
                  <FiMapPin />
                  <span><b>Deliver to {selected.deliveryAddress.fullName}</b><small>{[selected.deliveryAddress.addressLine1, selected.deliveryAddress.addressLine2, selected.deliveryAddress.city, selected.deliveryAddress.state, selected.deliveryAddress.pincode].filter(Boolean).join(", ")}</small></span>
                </div>
                <div className="payment-note"><FiShield /> {selected.paymentMethod?.toUpperCase()} · Payment {selected.paymentStatus}</div>
                {selected.canCancel && (
                  <div className="cancel-order-box">
                    <label>Need to cancel?</label>
                    <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} maxLength={300} placeholder="Tell us the reason" />
                    <button disabled={cancelling || cancelReason.trim().length < 3} onClick={cancelOrder}>
                      {cancelling ? "Cancelling…" : "Cancel order"}
                    </button>
                    <small>Cancellation is available until the order is packed.</small>
                  </div>
                )}
              </>
            ) : (
              <div className="order-detail-placeholder"><FiClock /><p>Select an order to see delivery details.</p></div>
            )}
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

export default function ShopPage() {
  const [urlCompany, setUrlCompany] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeError, setStoreError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [menu, setMenu] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [cart, setCart] = useState([]);
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [companySlug, setCompanySlug] = useState(urlCompany);
  const [storeName, setStoreName] = useState("Pankajal Store");
  const [viewMode, setViewMode] = useState("grid");
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    const companyFromUrl =
      new URLSearchParams(window.location.search).get("company") || "";
    const erpUser = safeRead("user", null);
    const loggedInCompany =
      erpUser?.companyId || erpUser?._id || erpUser?.id || "";
    setUrlCompany(companyFromUrl);
    // Remove any cart rows left by the old preview catalog; only real API items remain.
    setCart(
      safeRead(CART_KEY, []).filter(
        (line) => !String(line?.product?._id || "").startsWith("demo-")
      )
    );
    setToken(localStorage.getItem(TOKEN_KEY) || "");
    setUser(safeRead(USER_KEY, null));
    const savedSlug = localStorage.getItem("pankajal_store_slug") || "";
    setCompanySlug(companyFromUrl || savedSlug || loggedInCompany);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);
  useEffect(() => {
    const controller = new AbortController();
    const erpToken = localStorage.getItem("token") || "";
    const erpUser = safeRead("user", null);
    const loggedInCompany =
      erpUser?.companyId || erpUser?._id || erpUser?.id || "";
    const companyKey =
      urlCompany ||
      localStorage.getItem("pankajal_store_slug") ||
      loggedInCompany ||
      process.env.NEXT_PUBLIC_STORE_COMPANY_SLUG ||
      "";
    const useProtectedApi = !urlCompany && Boolean(erpToken);
    const endpoint = useProtectedApi
      ? "/api/items?limit=200"
      : `/api/items?storefront=true&company=${encodeURIComponent(
          companyKey
        )}&limit=200`;
    const headers = useProtectedApi
      ? { Authorization: `Bearer ${erpToken}` }
      : {};

    setLoading(true);
    setStoreError("");
    fetch(endpoint, { signal: controller.signal, headers })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.message || "Unable to load this company catalog"
          );
        const apiItems = (data.products || data.data || []).map(
          normalizeApiItem
        );
        setProducts(apiItems);
        setStoreName(
          data.company?.name ||
            erpUser?.companyName ||
            erpUser?.name ||
            "Pankajal Store"
        );
        if (!apiItems.length)
          setStoreError(
            "This company has no items yet. Add active items in Item Master first."
          );
        if (companyKey) setCompanySlug(companyKey);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setProducts([]);
          setStoreError(
            companyKey
              ? err.message
              : "Company not selected. Sign in as a company or open a company storefront link."
          );
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [urlCompany, token]);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((p) => p.category || "General"))],
    [products]
  );
  const visible = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (category === "All" || p.category === category) &&
            `${p.name} ${p.category} ${p.description}`
              .toLowerCase()
              .includes(search.toLowerCase())
        )
        .sort((a, b) =>
          sort === "low"
            ? a.storePrice - b.storePrice
            : sort === "high"
            ? b.storePrice - a.storePrice
            : Number(b.isFeatured) - Number(a.isFeatured)
        ),
    [products, category, search, sort]
  );
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const toggleWishlist = (event, product) => {
    event.stopPropagation();
    setWishlist((current) =>
      current.includes(String(product._id))
        ? current.filter((id) => id !== String(product._id))
        : [...current, String(product._id)]
    );
  };
  const flash = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };
  const add = (product, qty = 1, variant = null) => {
    const key = `${product._id}-${variant?._id || "base"}`;
    setCart((current) => {
      const found = current.find((i) => i.key === key);
      return found
        ? current.map((i) =>
            i.key === key
              ? { ...i, qty: Math.min(i.qty + qty, product.stockQty || 99) }
              : i
          )
        : [
            ...current,
            {
              key,
              product,
              variant,
              qty,
              price: variant?.storePrice ?? product.storePrice,
            },
          ];
    });
    flash(`${product.name} added to your bag`);
  };
  const buy = (product, qty = 1, variant = null) => {
    add(product, qty, variant);
    setSelected(null);
    window.setTimeout(() => setCartOpen(true), 100);
  };
  const beginCheckout = () => {
    setCartOpen(false);
    if (!user) {
      setAuthOpen(true);
      flash("Log in to continue to checkout");
    } else setCheckoutOpen(true);
  };
  const authenticated = (authToken, customer, slug) => {
    localStorage.setItem(TOKEN_KEY, authToken);
    localStorage.setItem(USER_KEY, JSON.stringify(customer));
    localStorage.setItem("pankajal_store_slug", slug);
    setToken(authToken);
    setUser(customer);
    setCompanySlug(slug);
    setAuthOpen(false);
    if (cart.length) setCheckoutOpen(true);
    flash(`Welcome, ${customer.fullName}`);
  };
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
    flash("You are logged out");
  };
  const customerUpdated = (customer) => {
    localStorage.setItem(USER_KEY, JSON.stringify(customer));
    setUser(customer);
  };
  const orderSuccess = (number) => {
    setOrderNumber(number);
    setCheckoutOpen(false);
    setCart([]);
  };

  return (
    <main className="shop-shell">
      <MobileDailyShop
        products={products}
        loading={loading}
        storeError={storeError}
        user={user}
        token={token}
        storeName={storeName}
        cartCount={cartCount}
        onLogin={() => setAuthOpen(true)}
        onOpenCart={() => setCartOpen(true)}
        onOpenOrders={() => setOrdersOpen(true)}
        onAdd={add}
        onLogout={logout}
        onUserUpdated={customerUpdated}
      />
      <div className="shop-announcement">
        <span>Free shipping above ₹999</span>
        <span>•</span>
        <span>Live inventory from ERP</span>
        <a href="#collection">
          Shop now <FiArrowUpRight />
        </a>
      </div>
      {storeError && (
        <div className="preview-bar">
          <FiBox /> {storeError}
        </div>
      )}
      <header className="shop-header">
        <div className="header-inner">
          <Link href="/" className="shop-brand">
            <span>P</span>
            <div>
              {storeName}
              <small>Powered by Pankajal ERP</small>
            </div>
          </Link>
          <nav className={menu ? "open" : ""}>
            <a href="#new" onClick={() => setMenu(false)}>
              Discover
            </a>
            <a href="#collection" onClick={() => setMenu(false)}>
              Products
            </a>
            <a href="#promise" onClick={() => setMenu(false)}>
              Why us
            </a>
          </nav>
          <div className="header-actions">
            {user ? (
              <div className="user-menu">
                <div className="user-avatar">
                  <FiUser />
                </div>
                <span>Hi, {user.fullName?.split(" ")[0]}</span>
                <button onClick={() => setOrdersOpen(true)}>My orders</button>
                <button onClick={logout}>Log out</button>
              </div>
            ) : (
              <button
                className="login-button"
                onClick={() => setAuthOpen(true)}
              >
                <FiUser /> Account
              </button>
            )}
            <button className="wishlist-header" aria-label="Wishlist">
              <FiHeart />
              <span>{wishlist.length}</span>
            </button>
            <button className="bag-button" onClick={() => setCartOpen(true)}>
              <FiShoppingBag />
              <span>{cartCount}</span>
            </button>
            <button className="menu-button" onClick={() => setMenu(!menu)}>
              {menu ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </header>
      <section className="shop-hero" id="new">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />
        <div className="hero-copy">
          <div className="live-badge">
            <i />
            Live company storefront
          </div>
          <h1>
            Find your next
            <br />
            <em>favourite.</em>
          </h1>
          <p>
            Fresh products, real-time stock and transparent pricing—connected
            directly to {storeName}&apos;s ERP catalog.
          </p>
          <div className="hero-actions">
            <a href="#collection" className="primary-button">
              Explore products <FiArrowRight />
            </a>
            <button
              className="hero-search-button"
              onClick={() => document.getElementById("catalog-search")?.focus()}
            >
              <FiSearch /> Search catalog
            </button>
          </div>
          <div className="hero-metrics">
            <div>
              <strong>{products.length || "—"}</strong>
              <span>Products</span>
            </div>
            <div>
              <strong>{Math.max(categories.length - 1, 0) || "—"}</strong>
              <span>Categories</span>
            </div>
            <div>
              <strong>Live</strong>
              <span>Stock status</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit" />
          <div
            className="hero-card card-one"
            onClick={() => products[0] && setSelected(products[0])}
          >
            <ProductArt product={products[0]} large />
            {products[0] && (
              <div className="hero-product-label">
                <span>{products[0].category}</span>
                <b>{products[0].name}</b>
                <strong>{money(products[0].storePrice)}</strong>
              </div>
            )}
          </div>
          <div
            className="hero-card card-two"
            onClick={() => products[1] && setSelected(products[1])}
          >
            <ProductArt product={products[1]} />
          </div>
          <div className="floating-note">
            <FiPackage />
            <span>Synced</span>
            <b>
              Live from
              <br />
              your ERP
            </b>
          </div>
        </div>
      </section>
      <section className="promise-bar" id="promise">
        <div>
          <FiTruck />
          <span>
            <b>Fast dispatch</b>
            <small>Carefully packed & tracked</small>
          </span>
        </div>
        <div>
          <FiShield />
          <span>
            <b>Secure payments</b>
            <small>Your data stays protected</small>
          </span>
        </div>
        <div>
          <FiCheckCircle />
          <span>
            <b>Quality checked</b>
            <small>Selected with care</small>
          </span>
        </div>
        <div>
          <FiHeart />
          <span>
            <b>Human support</b>
            <small>We're here when needed</small>
          </span>
        </div>
      </section>
      <section className="collection" id="collection">
        <div className="collection-head">
          <div>
            <p className="eyebrow">EXPLORE THE CATALOG</p>
            <h2>Products worth discovering</h2>
            <p>
              Showing {visible.length} of {products.length} live products.
            </p>
          </div>
          <div className="catalog-tools">
            <label className="search-box">
              <FiSearch />
              <input
                id="catalog-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or category…"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <FiX />
                </button>
              )}
            </label>
            <label className="sort-box">
              <span>Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
              <FiChevronDown />
            </label>
            <div className="view-switch">
              <button
                className={viewMode === "grid" ? "active" : ""}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <FiGrid />
              </button>
              <button
                className={viewMode === "list" ? "active" : ""}
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <FiList />
              </button>
            </div>
          </div>
        </div>
        <div className="category-row">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={category === c ? "active" : ""}
            >
              {c}
              <span>
                {c === "All"
                  ? products.length
                  : products.filter((p) => p.category === c).length}
              </span>
            </button>
          ))}
        </div>
        {loading ? (
          <div className="product-grid">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <div className="product-skeleton" key={i}>
                  <span />
                  <i />
                  <i />
                </div>
              ))}
          </div>
        ) : visible.length ? (
          <div
            className={`product-grid ${viewMode === "list" ? "list-view" : ""}`}
          >
            {visible.map((product, index) => (
              <motion.article
                className="product-card"
                key={product._id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index % 4) * 0.04 }}
                onClick={() => setSelected(product)}
              >
                <div className="product-visual">
                  <ProductArt product={product} />
                  {product.discount > 0 && (
                    <span className="sale-pill">Save {product.discount}%</span>
                  )}
                  <span
                    className={`stock-pill ${product.inStock ? "" : "out"}`}
                  >
                    <i />
                    {product.inStock ? "In stock" : "Sold out"}
                  </span>
                  <button
                    className={`wish-button ${
                      wishlist.includes(String(product._id)) ? "active" : ""
                    }`}
                    onClick={(e) => toggleWishlist(e, product)}
                    aria-label={`Save ${product.name}`}
                  >
                    <FiHeart />
                  </button>
                  <button
                    className="quick-add"
                    disabled={!product.inStock}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (product.inStock) add(product);
                    }}
                    aria-label={`Add ${product.name} to cart`}
                  >
                    <FiShoppingBag />
                    <span>
                      {product.inStock ? "Add to bag" : "Out of stock"}
                    </span>
                  </button>
                </div>
                <div className="product-copy">
                  <p>{product.category}</p>
                  <h3>{product.name}</h3>
                  <div>
                    <strong>{money(product.storePrice)}</strong>
                    {product.mrp > product.storePrice && (
                      <del>{money(product.mrp)}</del>
                    )}
                    <span>
                      <FiStar />
                      4.8
                    </span>
                  </div>
                  <small>
                    {product.description || `Available per ${product.unit}`}
                  </small>
                  <button className="card-arrow">
                    <FiArrowUpRight />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <FiBox />
            <h3>
              {storeError ? "Company catalog unavailable" : "No matches found"}
            </h3>
            <p>{storeError || "Try a different search or category."}</p>
            {storeError ? (
              <Link href="/signin">Sign in as company</Link>
            ) : (
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>
      <section className="shop-story">
        <div>
          <p className="eyebrow">THE PANKAJAL PROMISE</p>
          <h2>
            Made to be used.
            <br />
            Chosen to be loved.
          </h2>
        </div>
        <p>
          We believe the best things are the ones you reach for every day. Every
          product is assessed for material, utility and finish before it reaches
          the collection.
        </p>
        <Link href="/" className="story-link">
          <FiArrowLeft /> Back to Pankajal ERP
        </Link>
      </section>
      <footer className="shop-footer">
        <Link href="/" className="shop-brand inverse">
          <span>P</span>
          <div>
            {storeName}
            <small>Powered by Pankajal ERP</small>
          </div>
        </Link>
        <p>Real products. Live inventory. A smoother way to shop.</p>
        <div>
          <a href="#collection">Products</a>
          <a href="#promise">Benefits</a>
          <button onClick={() => user ? setOrdersOpen(true) : setAuthOpen(true)}>
            {user ? "My orders" : "Customer login"}
          </button>
        </div>
        <small>
          © {new Date().getFullYear()} Pankajal ERP. All rights reserved.
        </small>
      </footer>
      <AnimatePresence>
        {selected && (
          <DetailsModal
            product={selected}
            onClose={() => setSelected(null)}
            onAdd={add}
            onBuy={buy}
          />
        )}
      </AnimatePresence>
      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onQty={(key, qty) =>
          setCart(cart.map((i) => (i.key === key ? { ...i, qty } : i)))
        }
        onRemove={(key) => setCart(cart.filter((i) => i.key !== key))}
        onCheckout={beginCheckout}
      />
      <AnimatePresence>
        {authOpen && (
          <AuthModal
            open
            companySlug={companySlug}
            onClose={() => setAuthOpen(false)}
            onAuthenticated={authenticated}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {checkoutOpen && (
          <CheckoutModal
            cart={cart}
            user={user}
            token={token}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={orderSuccess}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {ordersOpen && (
          <OrdersModal
            open
            token={token}
            onClose={() => setOrdersOpen(false)}
            onShop={() => setOrdersOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="shop-toast"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <FiCheckCircle />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {orderNumber && (
          <div className="modal-backdrop">
            <motion.div
              className="success-modal"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="success-check">
                <FiCheck />
              </div>
              <p className="eyebrow">ORDER CONFIRMED</p>
              <h2>Thank you for shopping!</h2>
              <p>
                Your order <b>#{orderNumber}</b> is confirmed. We’ll prepare it
                carefully and keep you updated.
              </p>
              <button
                className="primary-button wide"
                onClick={() => {
                  setOrderNumber("");
                  setOrdersOpen(true);
                }}
              >
                View my order
              </button>
              <button className="text-button" onClick={() => setOrderNumber("")}>Continue shopping</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
