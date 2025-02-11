'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface AttendanceRecord {
  ID: number;
  Date: string;
  StartTime: string | null;
  EndTime: string | null;
  Overtime?: string;
  Comment?: string;
}

const formatTimeForInput = (timeValue: string | null): string => {
  if (!timeValue) return "";
  const dateObj = new Date(timeValue);
  // Format hours and minutes as two digit numbers.
  const hours = dateObj.getHours().toString().padStart(2, "0");
  const minutes = dateObj.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function AttendancePage() {
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [message, setMessage] = useState("");
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editComment, setEditComment] = useState("");

  // Fetch monthly summary from API.
  const fetchMonthlySummary = async () => {
    try {
      const res = await fetch(
        `/api/attendance/monthly?month=${selectedMonth}&year=${selectedYear}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (res.ok) {
        const json = await res.json();
        setMonthlyRecords(json.attendance || []);
      } else {
        setMonthlyRecords([]);
      }
    } catch (error) {
      console.error("Error fetching monthly summary:", error);
      setMonthlyRecords([]);
    }
  };

  useEffect(() => {
    fetchMonthlySummary();
  }, [selectedMonth, selectedYear]);

  // Generate complete list of days for the month.
  const getFullMonthRecords = (): AttendanceRecord[] => {
    const daysCount = new Date(selectedYear, selectedMonth, 0).getDate();
    const pad = (n: number): string => n.toString().padStart(2, "0");
    const fullRecords: AttendanceRecord[] = [];
    for (let day = 1; day <= daysCount; day++) {
      const dateStr = `${selectedYear}-${pad(selectedMonth)}-${pad(day)}`;
      fullRecords.push({
        ID: day,
        Date: dateStr,
        StartTime: "",
        EndTime: "",
        Overtime: "",
        Comment: "",
      });
    }
  
    monthlyRecords.forEach((record) => {
      const formattedDate = new Date(record.Date).toISOString().slice(0, 10);
      const parts = formattedDate.split("-");
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (year === selectedYear && month === selectedMonth && day >= 1 && day <= daysCount) {
          fullRecords[day - 1] = {
            ...record,
            Overtime: record.Overtime || "",
            Comment: record.Comment || "",
          };
        }
      }
    });
  
    return fullRecords;
  };

  // Record start and end work time.
  const handleStartWork = async () => {
    try {
      const res = await fetch("/api/attendance/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        setMessage("Start time recorded.");
        fetchMonthlySummary();
      } else {
        setMessage("Failed to record start time.");
      }
    } catch (error) {
      console.error("Error recording start time:", error);
      setMessage("Error recording start time.");
    }
  };

  const handleEndWork = async () => {
    try {
      const res = await fetch("/api/attendance/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        setMessage("End time recorded.");
        fetchMonthlySummary();
      } else {
        setMessage("Failed to record end time.");
      }
    } catch (error) {
      console.error("Error recording end time:", error);
      setMessage("Error recording end time.");
    }
  };

  // Update the attendance record after editing.
  const handleSaveEdit = async (record: AttendanceRecord) => {
    // Ensure the Date is formatted as YYYY-MM-DD.
    const formattedDate = new Date(record.Date).toISOString().slice(0, 10);
    const updatedRecord = {
      ...record,
      Date: formattedDate,
      StartTime: editStartTime,
      EndTime: editEndTime,
      Comment: editComment,
    };
  
    try {
      const res = await fetch("/api/attendance/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedRecord),
      });
      if (res.ok) {
        setMessage("Record updated.");
        setEditingRecord(null);
        fetchMonthlySummary();
      } else {
        setMessage("Failed to update record.");
      }
    } catch (error) {
      console.error("Error updating record:", error);
      setMessage("Error updating record.");
    }
  };

  // Cancel edit mode.
  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  // When clicking Edit, pre-fill the edit state.
  const handleEditClick = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditStartTime(formatTimeForInput(record.StartTime));
    setEditEndTime(formatTimeForInput(record.EndTime));
    setEditComment(record.Comment || "");
  };

const formatTimeForPDF = (time: string | null): string => {
    if (!time) return "-";
    return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  // Generate PDF of attendance table only.
  const handlePrintPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Day", "Start Time", "End Time", "Overtime", "Comment"];
    const tableRows = getFullMonthRecords().map((record) => {
      const day = new Date(record.Date).getDate().toString();
      const start = formatTimeForPDF(record.StartTime);
      const end = formatTimeForPDF(record.EndTime);
      return [day, start, end, record.Overtime || "-", record.Comment || "-"];
    });
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
    });
    doc.save("attendance.pdf");
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Attendance Management</h1>
      {message && <p>{message}</p>}

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Month:
          <input
            type="number"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            min="1"
            max="12"
          />
        </label>
        <label style={{ marginLeft: "1rem" }}>
          Year:
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleStartWork}>Start Work</button>
        <button onClick={handleEndWork} style={{ marginLeft: "1rem" }}>End Work</button>
        {/* Removed the duplicate "Output to PDF" button that used window.print(). */}
        <button onClick={handlePrintPDF} style={{ marginLeft: "1rem" }}>Output to PDF</button>
      </div>

      <div>
        <table border={1} cellPadding={5}>
          <thead>
            <tr>
              <th>Month</th>
              <th>Date</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Overtime</th>
              <th>Comment</th>
              <th>Work Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getFullMonthRecords().map((record) => (
              <tr key={record.Date}>
                <td>{selectedMonth}</td>
                <td>{new Date(record.Date).getDate()}</td>
                <td>
                  {editingRecord && editingRecord.Date === record.Date ? (
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                    />
                  ) : record.StartTime ? (
                    new Date(record.StartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {editingRecord && editingRecord.Date === record.Date ? (
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                    />
                  ) : record.EndTime ? (
                    new Date(record.EndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  ) : (
                    "-"
                  )}
                </td>
                <td>{record.Overtime || "-"}</td>
                <td>
                  {editingRecord && editingRecord.Date === record.Date ? (
                    <input
                      type="text"
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                    />
                  ) : (
                    record.Comment || "-"
                  )}
                </td>
                <td>
                  {record.StartTime && record.EndTime
                    ? (() => {
                        const start = new Date(record.StartTime);
                        const end = new Date(record.EndTime);
                        const diffMs = end.getTime() - start.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const hours = Math.floor(diffMins / 60);
                        const mins = diffMins % 60;
                        return `${hours}h ${mins}m`;
                      })()
                    : "-"}
                </td>
                <td>
                  {editingRecord && editingRecord.Date === record.Date ? (
                    <>
                      <button onClick={() => handleSaveEdit(record)}>Save</button>
                      <button onClick={handleCancelEdit} style={{ marginLeft: "0.5rem" }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => handleEditClick(record)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: "20px" }}>
        <Link href="/dashboard/">Back to Dashboard</Link>
      </p>
    </div>
  );
}