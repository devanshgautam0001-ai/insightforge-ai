import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Mail,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { User } from "../types";
import { Language, translations } from "../lib/translations";

interface EnterpriseRequestsProps {
  currentUser: User;
  lang: Language;
}

interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  createdAt: string;
  status: "Pending" | "In Progress" | "Closed";
}

export default function EnterpriseRequests({ currentUser, lang }: EnterpriseRequestsProps) {
  const t = translations[lang];
  const [requestsList, setRequestsList] = useState<DemoRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("/api/admin/demo-requests", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequestsList(data.requests || []);
      } else {
        let errStr = "Failed to retrieve corporate requests directory.";
        try {
          const errData = await res.json();
          errStr = errData.error || errStr;
        } catch (e) {}
        setErrorMsg(errStr);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error trying to fetch corporate requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    setUpdatingId(requestId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/admin/demo-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setSuccessMsg(`Request status updated to [ ${newStatus.toUpperCase()} ] successfully.`);
        // Refresh local items
        setRequestsList(prev =>
          prev.map(item => (item.id === requestId ? { ...item, status: newStatus as any } : item))
        );
        if (selectedRequest && selectedRequest.id === requestId) {
          setSelectedRequest(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        let errStr = "Failed to update request status.";
        try {
          const errData = await res.json();
          errStr = errData.error || errStr;
        } catch (e) {}
        setErrorMsg(errStr);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error updating request status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter & Search Logic
  const filteredRequests = requestsList.filter(req => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      req.id.toLowerCase().includes(query) ||
      req.name.toLowerCase().includes(query) ||
      req.email.toLowerCase().includes(query) ||
      req.company.toLowerCase().includes(query) ||
      req.message.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "All" || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-[#F5B942]/10 border border-[#F5B942]/30 text-[#F5B942]";
      case "In Progress":
        return "bg-[#4EA1FF]/10 border border-[#4EA1FF]/30 text-[#4EA1FF]";
      case "Closed":
        return "bg-[#2DD9A8]/10 border border-[#2DD9A8]/30 text-[#2DD9A8]";
      default:
        return "bg-[#545B6E]/10 border border-[#545B6E]/30 text-[#545B6E]";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-void text-text-primary p-6 font-mono text-xs max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border-hairline mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-signal uppercase tracking-wider text-[10px] font-bold">
            <Mail className="w-3.5 h-3.5" />
            <span>Advisory Connection Operations</span>
          </div>
          <h2 className="text-xl font-display font-black text-text-primary mt-1 uppercase">Enterprise Requests</h2>
          <p className="text-text-muted text-[10px] mt-0.5">
            Manage corporate trial tenants, advisory connections, and schedule onboarding live tours.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-2 bg-bg-surface-raised border border-border-hairline hover:border-text-muted text-text-secondary hover:text-text-primary px-3.5 py-1.5 rounded transition font-bold uppercase tracking-wider text-[10px] self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-accent-signal" : ""}`} />
          Refresh Directory
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-[#2DD9A8]/10 border border-[#2DD9A8]/30 text-[#2DD9A8] p-3 rounded-sm mb-6 flex items-center gap-2.5 animate-in fade-in duration-150">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span className="font-bold uppercase tracking-wide text-[10px]">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-[#FF4E4E]/10 border border-[#FF4E4E]/30 text-[#FF4E4E] p-3 rounded-sm mb-6 flex items-center gap-2.5 animate-in fade-in duration-150">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-bold uppercase tracking-wide text-[10px]">{errorMsg}</span>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table/Directory section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls Bar */}
          <div className="bg-bg-surface/30 border border-border-hairline p-3.5 rounded flex flex-col md:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="SEARCH REFERENCE, NAME, COMPANY, MESSAGE..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-bg-void border border-border-hairline rounded py-2 pl-9 pr-4 text-[10px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-signal transition font-bold"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <span className="text-[9px] text-text-muted tracking-wider uppercase font-bold shrink-0">STATUS:</span>
              <div className="flex gap-1.5 p-0.5 bg-bg-void rounded border border-border-hairline w-full md:w-auto justify-between">
                {["All", "Pending", "In Progress", "Closed"].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${
                      statusFilter === status
                        ? "bg-accent-signal text-bg-void"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-bg-surface/40 border border-border-hairline rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-hairline bg-bg-surface text-text-muted font-bold tracking-widest text-[9px] uppercase">
                    <th className="py-3 px-4">REFERENCE ID</th>
                    <th className="py-3 px-4">CLIENT DETAILS</th>
                    <th className="py-3 px-4">SUBMITTED ON</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {filteredRequests.map(req => (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={`hover:bg-bg-surface/30 transition duration-150 cursor-pointer ${
                        selectedRequest?.id === req.id ? "bg-bg-surface/50" : ""
                      }`}
                    >
                      {/* Reference ID */}
                      <td className="py-3.5 px-4 font-bold text-accent-warning selection:bg-accent-warning/20">
                        {req.id}
                      </td>

                      {/* Client Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text-primary text-[11px]">{req.name}</div>
                        <div className="text-[10px] text-text-secondary mt-0.5 font-sans font-medium">
                          {req.company} • <span className="font-mono text-[9px]">{req.email}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-text-secondary text-[10px]">
                        {new Date(req.createdAt).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold uppercase ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </td>

                      {/* Action trigger button */}
                      <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <select
                            disabled={updatingId === req.id}
                            value={req.status}
                            onChange={e => handleStatusChange(req.id, e.target.value)}
                            className="bg-bg-void border border-border-hairline rounded text-[9px] font-bold uppercase py-1 px-1.5 text-text-secondary focus:outline-none focus:border-accent-signal cursor-pointer hover:border-text-muted transition disabled:opacity-50"
                          >
                            <option value="Pending">PENDING</option>
                            <option value="In Progress">IN PROGRESS</option>
                            <option value="Closed">CLOSED</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-text-muted uppercase text-[10px] tracking-wider">
                        {loading ? "Synchronizing ledger directory..." : "No corporate trials registered."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detailed inquiry panel */}
        <div className="space-y-4">
          <div className="bg-[#12141B] border border-border-hairline p-5 rounded relative overflow-hidden h-full flex flex-col min-h-[450px]">
            {/* Design header lines */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-signal/40 via-accent-warning/40 to-transparent" />

            <div className="border-b border-border-hairline pb-3.5 mb-4 flex items-center justify-between">
              <span className="text-[9px] text-accent-signal font-bold tracking-widest uppercase">DEMO INQUIRY METADATA</span>
              {selectedRequest && (
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getStatusBadge(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
              )}
            </div>

            {selectedRequest ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {/* Title reference ID */}
                  <div>
                    <span className="block text-[8px] text-text-muted font-bold tracking-wider uppercase">REFERENCE KEY</span>
                    <h3 className="text-sm font-bold text-accent-warning mt-0.5 select-all">{selectedRequest.id}</h3>
                  </div>

                  {/* Company */}
                  <div>
                    <span className="block text-[8px] text-text-muted font-bold tracking-wider uppercase">COMPANY TRIAL</span>
                    <p className="text-[11px] font-bold text-[#EDEEF2] mt-0.5">{selectedRequest.company}</p>
                  </div>

                  {/* Client Name */}
                  <div>
                    <span className="block text-[8px] text-text-muted font-bold tracking-wider uppercase">REPRESENTATIVE</span>
                    <p className="text-[11px] font-bold text-text-primary mt-0.5">{selectedRequest.name}</p>
                  </div>

                  {/* Corporate Email */}
                  <div>
                    <span className="block text-[8px] text-text-muted font-bold tracking-wider uppercase">CORPORATE EMAIL</span>
                    <p className="text-[11px] font-bold text-accent-signal mt-0.5 break-all select-all">{selectedRequest.email}</p>
                  </div>

                  {/* Submitted Date */}
                  <div>
                    <span className="block text-[8px] text-text-muted font-bold tracking-wider uppercase">TRANSMITTED AT</span>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {new Date(selectedRequest.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Message details */}
                  <div className="border-t border-border-hairline/60 pt-3.5">
                    <span className="block text-[8px] text-text-muted font-bold tracking-wider uppercase mb-1.5">SPECIFIC FORECASTING INQUIRY</span>
                    <div className="bg-[#0A0B0F] border border-[#262A35] p-3 rounded font-sans text-[11px] text-[#A9B2C3] leading-relaxed whitespace-pre-wrap select-all max-h-[180px] overflow-y-auto">
                      {selectedRequest.message}
                    </div>
                  </div>
                </div>

                {/* Operations change dropdown inside details */}
                <div className="bg-bg-surface/50 border border-border-hairline p-3 rounded-sm">
                  <span className="block text-[8px] text-text-muted font-bold tracking-wider uppercase mb-2">UPDATE DEMO REQUEST LIFECYCLE</span>
                  <div className="flex gap-2">
                    {["Pending", "In Progress", "Closed"].map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(selectedRequest.id, status)}
                        disabled={updatingId === selectedRequest.id}
                        className={`flex-1 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                          selectedRequest.status === status
                            ? getStatusBadge(status) + " cursor-default font-black"
                            : "bg-bg-void hover:bg-bg-surface text-text-muted hover:text-text-secondary border border-border-hairline"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <FileText className="w-10 h-10 text-border-hairline/80 mb-3 stroke-[1.5]" />
                <h4 className="text-[10px] uppercase font-bold text-text-muted tracking-widest">No Selection</h4>
                <p className="text-[9px] text-[#545B6E] mt-1 leading-relaxed max-w-[180px] uppercase font-bold">
                  Select a registered trial request from the directory to review details and change its status.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
