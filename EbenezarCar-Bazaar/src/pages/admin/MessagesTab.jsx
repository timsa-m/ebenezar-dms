import React, { useState, useEffect } from "react";
import { Check, Trash2, Mail, Phone, Calendar } from "lucide-react";
import { fetchContacts, updateContact, fetchTradeIns, updateTradeIn, fetchHireRequests, updateHireRequest } from "../../services/adminApi";
import Pagination from "./Pagination";

const MessagesTab = ({ type }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Reset state when tab changes
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
    fetchData(1);
  }, [type]);

  // Fetch when page changes
  useEffect(() => {
    fetchData(page);
  }, [page]);

  const fetchData = async (currentPage) => {
    try {
      setLoading(true);
      let res;
      if (type === "contacts") res = await fetchContacts({ page: currentPage, limit: 20 });
      else if (type === "tradeIns") res = await fetchTradeIns({ page: currentPage, limit: 20 });
      else if (type === "hire") res = await fetchHireRequests({ page: currentPage, limit: 20 });

      setItems(res.data || []);
      setTotalPages(res.totalPages || 1);
      setError("");
    } catch (err) {
      setError(`Failed to load ${type}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      if (type === "contacts") await updateContact(id, { status: newStatus });
      else if (type === "tradeIns") await updateTradeIn(id, { status: newStatus });
      else if (type === "hire") await updateHireRequest(id, { status: newStatus });
      
      setItems(prev => prev.map(item => item._id === id ? { ...item, status: newStatus } : item));
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleBulkMarkRead = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const newStatus = type === "contacts" ? "read" : "contacted";
    
    try {
      setLoading(true);
      await Promise.all(ids.map(id => {
        if (type === "contacts") return updateContact(id, { status: newStatus });
        if (type === "tradeIns") return updateTradeIn(id, { status: newStatus });
        return updateHireRequest(id, { status: newStatus });
      }));
      
      setSelectedIds(new Set());
      fetchData(page);
    } catch (err) {
      alert("Failed to perform bulk update.");
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i._id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const titles = {
    contacts: "Contact Messages",
    tradeIns: "Trade-In Inquiries",
    hire: "Hire Requests"
  };

  const getStatusColor = (status) => {
    if (status === "unread" || status === "pending") return "bg-red-100 text-red-700 border-red-200";
    if (status === "read" || status === "contacted") return "bg-green-100 text-green-700 border-green-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-brand-muted/60">
        <h2 className="text-xl font-heading font-semibold text-brand-primary">{titles[type]}</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-muted/60 overflow-hidden relative">
        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="absolute top-0 left-0 right-0 bg-brand-primary text-white p-3 flex items-center justify-between z-10 animate-fade-in shadow-md">
            <span className="font-semibold">{selectedIds.size} items selected</span>
            <div className="flex gap-2">
              <button onClick={handleBulkMarkRead} className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                <Check size={16} /> Mark as Processed
              </button>
            </div>
          </div>
        )}

        {/* List Header */}
        <div className="p-4 border-b border-brand-muted/60 bg-slate-50 flex items-center gap-4">
          <input 
            id="selectAll"
            name="selectAll"
            type="checkbox" 
            aria-label="Select All"
            checked={items.length > 0 && selectedIds.size === items.length}
            onChange={toggleSelectAll}
            className="w-5 h-5 rounded border-slate-300 text-brand-accent focus:ring-brand-accent cursor-pointer"
          />
          <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Select All</span>
        </div>

        {/* List Content */}
        <div className="divide-y divide-slate-100">
          {loading ? (
             <div className="p-12 text-center text-slate-500 flex justify-center"><div className="h-8 w-8 border-3 border-brand-accent border-t-transparent rounded-full animate-spin"></div></div>
          ) : error ? (
            <div className="p-12 text-center text-red-500">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center">
              <span className="text-4xl mb-3">📭</span>
              <p>No messages found in this category.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item._id} className={`p-4 flex gap-4 transition-colors ${selectedIds.has(item._id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                <input 
                  id={`select-${item._id}`}
                  name={`select-${item._id}`}
                  type="checkbox" 
                  aria-label="Select Message"
                  checked={selectedIds.has(item._id)}
                  onChange={() => toggleSelect(item._id)}
                  className="w-5 h-5 mt-1 rounded border-slate-300 text-brand-accent focus:ring-brand-accent cursor-pointer"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-800 text-lg">
                      {type === "contacts" && item.name}
                      {type === "tradeIns" && `${item.makeModel} (${item.year})`}
                      {type === "hire" && (item.vehicle?.name || "Deleted Vehicle")}
                    </h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Contact Info Row */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {item.email && <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400"/> {item.email}</span>}
                    {item.phone && <span className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400"/> {item.phone}</span>}
                    {type === "hire" && item.startDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400"/> 
                        {new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 mt-2">
                    {type === "contacts" && item.message}
                    {type === "tradeIns" && (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <p><strong>Customer:</strong> {item.name}</p>
                        <p><strong>Mileage:</strong> {item.mileage?.toLocaleString()} km</p>
                        <p><strong>Condition:</strong> {item.condition}</p>
                      </div>
                    )}
                    {type === "hire" && (
                      <div>
                        <p><strong>Customer:</strong> {item.name}</p>
                        {item.notes && <p className="mt-2 text-slate-600 italic">"{item.notes}"</p>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {(item.status === "unread" || item.status === "pending") && (
                    <div className="pt-2">
                      <button 
                        onClick={() => handleStatusUpdate(item._id, type === "contacts" ? "read" : "contacted")}
                        className="text-sm font-semibold text-brand-accent hover:text-brand-accentLight"
                      >
                        Mark as Processed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default MessagesTab;
