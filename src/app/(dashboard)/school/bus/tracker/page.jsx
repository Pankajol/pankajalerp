"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FaBus,
  FaMapMarkerAlt,
  FaClock,
  FaSync,
  FaEdit,
  FaPlus,
  FaPlay,
  FaStop,
} from "react-icons/fa";
import { toast } from "react-toastify";
import TrackerUpdateModal from "@/components/school/bus/TrackerUpdateModal";
import Map from "@/components/Map";

// How often the page re-fetches tracker positions from the server.
// Lower = fresher data, more requests. 5s is a good balance for live bus tracking.
const POLL_INTERVAL_MS = 5000;

export default function BusTrackerPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [trackers, setTrackers] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const watchIds = useRef({}); // store watchPosition IDs per vehicle

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const vehiclesRes = await api.get("/school/bus/vehicles", {
        params: { limit: 1000, status: "active" },
        ...headers,
      });
      const allVehicles = vehiclesRes.data.data || [];

      const trackersRes = await api.get("/school/bus/tracker", headers);
      const allTrackers = trackersRes.data.data || [];

      const trackerMap = {};
      allTrackers.forEach((t) => {
        if (t.vehicle && t.vehicle._id) {
          trackerMap[t.vehicle._id] = t;
        }
      });

      setVehicles(allVehicles);
      setTrackers(trackerMap);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bus data");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true); // first load shows the skeleton
    const interval = setInterval(() => fetchData(false), POLL_INTERVAL_MS); // background refreshes are silent, no skeleton flicker
    return () => clearInterval(interval);
  }, []);

  // ─── Auto‑track: start watching this device's own GPS and post it ──
  const startAutoTrack = (vehicle) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }

    // Stop any existing watch for this vehicle
    if (watchIds.current[vehicle._id]) {
      navigator.geolocation.clearWatch(watchIds.current[vehicle._id]);
      delete watchIds.current[vehicle._id];
      toast.info(`Auto‑tracking stopped for ${vehicle.busNumber}`);
      return;
    }

    toast.success(`Starting auto‑tracking for ${vehicle.busNumber}...`);

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          const token = localStorage.getItem("token");
          const headers = { headers: { Authorization: `Bearer ${token}` } };
          const payload = {
            vehicleId: vehicle._id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed: pos.coords.speed || 0,
            status: "on route",
          };
          await api.post("/school/bus/tracker", payload, headers);
          // Other viewers pick this up on their next poll (within POLL_INTERVAL_MS)
        } catch (err) {
          console.error("Auto‑track update failed:", err);
        }
      },
      (err) => {
        toast.error(`GPS error: ${err.message}`);
        if (watchIds.current[vehicle._id]) {
          navigator.geolocation.clearWatch(watchIds.current[vehicle._id]);
          delete watchIds.current[vehicle._id];
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    watchIds.current[vehicle._id] = watchId;
  };

  // ─── Stop all auto‑tracking when component unmounts ────────────
  useEffect(() => {
    return () => {
      Object.values(watchIds.current).forEach((id) => {
        navigator.geolocation.clearWatch(id);
      });
    };
  }, []);

  const handleUpdate = (vehicle) => {
    setSelectedVehicle(vehicle);
    setModalOpen(true);
  };

  const statusColors = {
    "on route": "bg-emerald-100 text-emerald-700",
    "at stop": "bg-amber-100 text-amber-700",
    delayed: "bg-red-100 text-red-700",
    inactive: "bg-gray-100 text-gray-500",
  };

  const displayItems = vehicles.map((vehicle) => ({
    ...vehicle,
    tracker: trackers[vehicle._id] || null,
  }));

  const mapLocations = displayItems
    .filter((item) => item.tracker)
    .map((item) => ({
      latitude: item.tracker.latitude,
      longitude: item.tracker.longitude,
      label: item.busNumber,
    }));

  const isAutoTracking = (vehicleId) => !!watchIds.current[vehicleId];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBus className="text-indigo-500" size={24} />
            Bus Tracker
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Live locations of all buses · refreshing every {POLL_INTERVAL_MS / 1000}s
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition"
        >
          <FaSync /> Refresh
        </button>
      </div>

      {mapLocations.length > 0 && (
        <div className="mb-6 bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
          <Map locations={mapLocations} zoom={13} />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              <div className="mt-4 h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
          <FaBus size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No buses found</h3>
          <p className="text-gray-400 mt-1">
            Please add a bus vehicle first, then start tracking.
          </p>
          <button
            onClick={() => router.push("/school/bus/vehicles")}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
          >
            Go to Vehicles
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayItems.map((item) => {
            const tracker = item.tracker;
            const hasTracker = !!tracker;
            const autoTracking = isAutoTracking(item._id);

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <FaBus className="text-indigo-500" />
                      {item.busNumber}
                    </h3>
                    <p className="text-sm text-gray-500">{item.driverName}</p>
                  </div>
                  {hasTracker ? (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tracker.status] || "bg-gray-100 text-gray-500"}`}>
                      {tracker.status}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Not tracking
                    </span>
                  )}
                </div>

                {hasTracker ? (
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaMapMarkerAlt className="text-indigo-400" />
                      <span>
                        {Number(tracker.latitude).toFixed(6)}, {Number(tracker.longitude).toFixed(6)}
                      </span>
                    </div>
                    {tracker.speed > 0 && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaClock className="text-indigo-400" />
                        <span>{tracker.speed} km/h</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <FaClock size={12} />
                      <span>Updated: {new Date(tracker.lastUpdate).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-gray-400 italic">
                    No location data yet
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  {/* Manual update button */}
                  <button
                    onClick={() => handleUpdate(item)}
                    className="w-full py-2 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition flex items-center justify-center gap-2"
                  >
                    {hasTracker ? (
                      <>
                        <FaEdit size={14} /> Update Location
                      </>
                    ) : (
                      <>
                        <FaPlus size={14} /> Start Tracking
                      </>
                    )}
                  </button>

                  {/* Auto‑track button */}
                  <button
                    onClick={() => startAutoTrack(item)}
                    className={`w-full py-2 rounded-2xl transition flex items-center justify-center gap-2 ${
                      autoTracking
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    {autoTracking ? (
                      <>
                        <FaStop size={14} /> Stop Auto‑Track
                      </>
                    ) : (
                      <>
                        <FaPlay size={14} /> Start Auto‑Track
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <TrackerUpdateModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedVehicle(null); }}
        vehicle={selectedVehicle}
        onSuccess={() => fetchData(true)}
      />
    </div>
  );
}




// "use client";

// import { useEffect, useState, useRef } from "react";
// import { motion } from "framer-motion";
// import { useRouter } from "next/navigation";
// import api from "@/lib/api";
// import {
//   FaBus,
//   FaMapMarkerAlt,
//   FaClock,
//   FaSync,
//   FaEdit,
//   FaPlus,
//   FaPlay,
//   FaStop,
// } from "react-icons/fa";
// import { toast } from "react-toastify";
// import TrackerUpdateModal from "@/components/school/bus/TrackerUpdateModal";
// import Map from "@/components/Map";

// export default function BusTrackerPage() {
//   const router = useRouter();
//   const [vehicles, setVehicles] = useState([]);
//   const [trackers, setTrackers] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [selectedVehicle, setSelectedVehicle] = useState(null);
//   const watchIds = useRef({}); // store watchPosition IDs per vehicle

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };

//       const vehiclesRes = await api.get("/school/bus/vehicles", {
//         params: { limit: 1000, status: "active" },
//         headers,
//       });
//       const allVehicles = vehiclesRes.data.data || [];

//       const trackersRes = await api.get("/school/bus/tracker", headers);
//       const allTrackers = trackersRes.data.data || [];

//       const trackerMap = {};
//       allTrackers.forEach((t) => {
//         if (t.vehicle && t.vehicle._id) {
//           trackerMap[t.vehicle._id] = t;
//         }
//       });

//       setVehicles(allVehicles);
//       setTrackers(trackerMap);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load bus data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//     const interval = setInterval(fetchData, 30000);
//     return () => clearInterval(interval);
//   }, []);

//   // ─── Auto‑track: start watching location ──────────────────────
//   const startAutoTrack = (vehicle) => {
//     if (!navigator.geolocation) {
//       toast.error("Geolocation not supported by your browser");
//       return;
//     }

//     // Stop any existing watch for this vehicle
//     if (watchIds.current[vehicle._id]) {
//       navigator.geolocation.clearWatch(watchIds.current[vehicle._id]);
//       delete watchIds.current[vehicle._id];
//       toast.info(`Auto‑tracking stopped for ${vehicle.busNumber}`);
//       return;
//     }

//     toast.success(`Starting auto‑tracking for ${vehicle.busNumber}...`);

//     const watchId = navigator.geolocation.watchPosition(
//       async (pos) => {
//         try {
//           const token = localStorage.getItem("token");
//           const headers = { headers: { Authorization: `Bearer ${token}` } };
//           const payload = {
//             vehicleId: vehicle._id,
//             latitude: pos.coords.latitude,
//             longitude: pos.coords.longitude,
//             speed: pos.coords.speed || 0,
//             status: "on route",
//           };
//           await api.post("/school/bus/tracker", payload, headers);
//           // Optionally update local state (we refresh every 30s anyway)
//         } catch (err) {
//           console.error("Auto‑track update failed:", err);
//         }
//       },
//       (err) => {
//         toast.error(`GPS error: ${err.message}`);
//         // Stop auto‑track on error
//         if (watchIds.current[vehicle._id]) {
//           navigator.geolocation.clearWatch(watchIds.current[vehicle._id]);
//           delete watchIds.current[vehicle._id];
//         }
//       },
//       { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
//     );

//     watchIds.current[vehicle._id] = watchId;
//   };

//   // ─── Stop all auto‑tracking when component unmounts ────────────
//   useEffect(() => {
//     return () => {
//       Object.values(watchIds.current).forEach((id) => {
//         navigator.geolocation.clearWatch(id);
//       });
//     };
//   }, []);

//   const handleUpdate = (vehicle) => {
//     setSelectedVehicle(vehicle);
//     setModalOpen(true);
//   };

//   const statusColors = {
//     "on route": "bg-emerald-100 text-emerald-700",
//     "at stop": "bg-amber-100 text-amber-700",
//     delayed: "bg-red-100 text-red-700",
//     inactive: "bg-gray-100 text-gray-500",
//   };

//   const displayItems = vehicles.map((vehicle) => ({
//     ...vehicle,
//     tracker: trackers[vehicle._id] || null,
//   }));

//   const mapLocations = displayItems
//     .filter((item) => item.tracker)
//     .map((item) => ({
//       latitude: item.tracker.latitude,
//       longitude: item.tracker.longitude,
//       label: item.busNumber,
//     }));

//   const isAutoTracking = (vehicleId) => !!watchIds.current[vehicleId];

//   return (
//     <div>
//       <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
//         <div>
//           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
//             <FaBus className="text-indigo-500" size={24} />
//             Bus Tracker
//           </h2>
//           <p className="text-sm text-gray-500 mt-1">
//             Live locations of all buses
//           </p>
//         </div>
//         <button
//           onClick={fetchData}
//           className="flex items-center gap-2 px-5 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition"
//         >
//           <FaSync /> Refresh
//         </button>
//       </div>

//       {mapLocations.length > 0 && (
//         <div className="mb-6 bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
//           <Map locations={mapLocations} zoom={13} />
//         </div>
//       )}

//       {loading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {Array.from({ length: 3 }).map((_, i) => (
//             <div key={i} className="animate-pulse bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
//               <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
//               <div className="h-3 bg-gray-200 rounded w-3/4"></div>
//               <div className="mt-4 h-8 bg-gray-200 rounded"></div>
//             </div>
//           ))}
//         </div>
//       ) : displayItems.length === 0 ? (
//         <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
//           <FaBus size={48} className="text-gray-300 mx-auto mb-4" />
//           <h3 className="text-lg font-semibold text-gray-700">No buses found</h3>
//           <p className="text-gray-400 mt-1">
//             Please add a bus vehicle first, then start tracking.
//           </p>
//           <button
//             onClick={() => router.push("/school/bus/vehicles")}
//             className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
//           >
//             Go to Vehicles
//           </button>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {displayItems.map((item) => {
//             const tracker = item.tracker;
//             const hasTracker = !!tracker;
//             const autoTracking = isAutoTracking(item._id);

//             return (
//               <motion.div
//                 key={item._id}
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
//               >
//                 <div className="flex items-start justify-between">
//                   <div>
//                     <h3 className="font-bold text-gray-800 flex items-center gap-2">
//                       <FaBus className="text-indigo-500" />
//                       {item.busNumber}
//                     </h3>
//                     <p className="text-sm text-gray-500">{item.driverName}</p>
//                   </div>
//                   {hasTracker ? (
//                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tracker.status] || "bg-gray-100 text-gray-500"}`}>
//                       {tracker.status}
//                     </span>
//                   ) : (
//                     <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
//                       Not tracking
//                     </span>
//                   )}
//                 </div>

//                 {hasTracker ? (
//                   <div className="mt-3 space-y-1 text-sm">
//                     <div className="flex items-center gap-2 text-gray-600">
//                       <FaMapMarkerAlt className="text-indigo-400" />
//                       <span>
//                         {tracker.latitude.toFixed(6)}, {tracker.longitude.toFixed(6)}
//                       </span>
//                     </div>
//                     {tracker.speed > 0 && (
//                       <div className="flex items-center gap-2 text-gray-600">
//                         <FaClock className="text-indigo-400" />
//                         <span>{tracker.speed} km/h</span>
//                       </div>
//                     )}
//                     <div className="flex items-center gap-2 text-gray-400 text-xs">
//                       <FaClock size={12} />
//                       <span>Updated: {new Date(tracker.lastUpdate).toLocaleTimeString()}</span>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="mt-3 text-sm text-gray-400 italic">
//                     No location data yet
//                   </div>
//                 )}

//                 <div className="mt-4 flex flex-col gap-2">
//                   {/* Manual update button */}
//                   <button
//                     onClick={() => handleUpdate(item)}
//                     className="w-full py-2 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition flex items-center justify-center gap-2"
//                   >
//                     {hasTracker ? (
//                       <>
//                         <FaEdit size={14} /> Update Location
//                       </>
//                     ) : (
//                       <>
//                         <FaPlus size={14} /> Start Tracking
//                       </>
//                     )}
//                   </button>

//                   {/* Auto‑track button */}
//                   <button
//                     onClick={() => startAutoTrack(item)}
//                     className={`w-full py-2 rounded-2xl transition flex items-center justify-center gap-2 ${
//                       autoTracking
//                         ? "bg-red-100 text-red-700 hover:bg-red-200"
//                         : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
//                     }`}
//                   >
//                     {autoTracking ? (
//                       <>
//                         <FaStop size={14} /> Stop Auto‑Track
//                       </>
//                     ) : (
//                       <>
//                         <FaPlay size={14} /> Start Auto‑Track
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </motion.div>
//             );
//           })}
//         </div>
//       )}

//       <TrackerUpdateModal
//         isOpen={modalOpen}
//         onClose={() => { setModalOpen(false); setSelectedVehicle(null); }}
//         vehicle={selectedVehicle}
//         onSuccess={fetchData}
//       />
//     </div>
//   );
// }




// "use client";

// import { useEffect, useState } from "react";
// import { motion } from "framer-motion";
// import api from "@/lib/api";
// import {
//   FaBus,
//   FaMapMarkerAlt,
//   FaClock,
//   FaSync,
//   FaEdit,
//   FaRoute,
// } from "react-icons/fa";
// import { toast } from "react-toastify";
// import TrackerUpdateModal from "@/components/school/bus/TrackerUpdateModal";

// export default function BusTrackerPage() {
//   const [trackers, setTrackers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [selectedVehicle, setSelectedVehicle] = useState(null);

//   const fetchTrackers = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const headers = { headers: { Authorization: `Bearer ${token}` } };
//       const res = await api.get("/school/bus/tracker", headers);
//       setTrackers(res.data.data || []);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load bus locations");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTrackers();
//     // Auto-refresh every 30 seconds
//     const interval = setInterval(fetchTrackers, 30000);
//     return () => clearInterval(interval);
//   }, []);

//   const handleUpdate = (vehicle) => {
//     setSelectedVehicle(vehicle);
//     setModalOpen(true);
//   };

//   const statusColors = {
//     "on route": "bg-emerald-100 text-emerald-700",
//     "at stop": "bg-amber-100 text-amber-700",
//     delayed: "bg-red-100 text-red-700",
//     inactive: "bg-gray-100 text-gray-500",
//   };

//   return (
//     <div>
//       <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
//         <div>
//           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
//             <FaBus className="text-indigo-500" size={24} />
//             Bus Tracker
//           </h2>
//           <p className="text-sm text-gray-500 mt-1">
//             Live locations of all buses
//           </p>
//         </div>
//         <button
//           onClick={fetchTrackers}
//           className="flex items-center gap-2 px-5 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition"
//         >
//           <FaSync /> Refresh
//         </button>
//       </div>

//       {/* Tracker Cards */}
//       {loading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {Array.from({ length: 3 }).map((_, i) => (
//             <div key={i} className="animate-pulse bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
//               <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
//               <div className="h-3 bg-gray-200 rounded w-3/4"></div>
//               <div className="mt-4 h-8 bg-gray-200 rounded"></div>
//             </div>
//           ))}
//         </div>
//       ) : trackers.length === 0 ? (
//         <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
//           <FaBus size={48} className="text-gray-300 mx-auto mb-4" />
//           <h3 className="text-lg font-semibold text-gray-700">No buses tracked yet</h3>
//           <p className="text-gray-400 mt-1">Update a bus location to start tracking.</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {trackers.map((tracker) => (
//             <motion.div
//               key={tracker._id}
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
//             >
//               <div className="flex items-start justify-between">
//                 <div>
//                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
//                     <FaBus className="text-indigo-500" />
//                     {tracker.vehicle?.busNumber || "Unknown"}
//                   </h3>
//                   <p className="text-sm text-gray-500">{tracker.vehicle?.driverName || "No driver"}</p>
//                 </div>
//                 <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tracker.status] || "bg-gray-100 text-gray-500"}`}>
//                   {tracker.status}
//                 </span>
//               </div>

//               <div className="mt-3 space-y-1 text-sm">
//                 <div className="flex items-center gap-2 text-gray-600">
//                   <FaMapMarkerAlt className="text-indigo-400" />
//                   <span>
//                     {tracker.latitude.toFixed(6)}, {tracker.longitude.toFixed(6)}
//                   </span>
//                 </div>
//                 {tracker.speed > 0 && (
//                   <div className="flex items-center gap-2 text-gray-600">
//                     <FaClock className="text-indigo-400" />
//                     <span>{tracker.speed} km/h</span>
//                   </div>
//                 )}
//                 <div className="flex items-center gap-2 text-gray-400 text-xs">
//                   <FaClock size={12} />
//                   <span>Updated: {new Date(tracker.lastUpdate).toLocaleTimeString()}</span>
//                 </div>
//               </div>

//               <button
//                 onClick={() => handleUpdate(tracker.vehicle)}
//                 className="mt-4 w-full py-2 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition flex items-center justify-center gap-2"
//               >
//                 <FaEdit size={14} /> Update Location
//               </button>
//             </motion.div>
//           ))}
//         </div>
//       )}

//       <TrackerUpdateModal
//         isOpen={modalOpen}
//         onClose={() => { setModalOpen(false); setSelectedVehicle(null); }}
//         vehicle={selectedVehicle}
//         onSuccess={fetchTrackers}
//       />
//     </div>
//   );
// }