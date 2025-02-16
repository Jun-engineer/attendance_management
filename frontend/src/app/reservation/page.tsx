'use client';

import { useState, useEffect } from "react";
import FullCalendar, {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventResizeDoneArg,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ReservationDetailSidebar from "../../../src/components/ReservationDetailSidebar";

export default function ReservationCalendar() {
  const [reservations, setReservations] = useState<EventInput[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  // Fetch reservations from the backend.
  useEffect(() => {
    async function fetchReservations() {
      try {
        const res = await fetch("/api/reservation/", { credentials: "include" });
        const data = await res.json();
  
        const events: EventInput[] = data.map((r: any) => ({
          id: r.id?.toString(),
          title: r.title + (r.comment ? " *" : ""),
          start: r.startTime,
          end: r.endTime,
          comment: r.comment || "",
        }));
  
        setReservations(events);
      } catch (error) {
        console.error("Error fetching reservations:", error);
      }
    }
    fetchReservations();
  }, []);

  // Callback when a time slot is selected.
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // Open sidebar so the user can fill in all details.
    setSelectedReservation({
      id: "", // Empty id indicates a new reservation; will use POST when saving.
      title: "",
      start: selectInfo.start,
      end: selectInfo.end,
      comment: "",
    });
  };

  // Callback when an event is dropped (time changed via drag & drop).
  const handleEventDrop = (dropInfo: EventDropArg) => {
    const event = dropInfo.event;
    const updatedData = {
      startTime: event.start,
      endTime: event.end,
      title: event.title, // Only the title is stored (without extra time info)
    };
    if (event.id) {
      fetch(`/api/reservation/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedData),
      })
        .then((res) => res.json())
        .catch((err) => console.error("Error updating reservation:", err));
    }
  };

  // Callback when an event is resized.
  const handleEventResize = (resizeInfo: EventResizeDoneArg) => {
    const event = resizeInfo.event;
    const updatedData = {
      startTime: event.start,
      endTime: event.end,
      title: event.title,
    };
    if (event.id) {
      fetch(`/api/reservation/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedData),
      })
        .then((res) => res.json())
        .catch((err) => console.error("Error updating reservation:", err));
    }
  };

  // Callback when an event is clicked.
  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedReservation({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      comment: event.extendedProps.comment || "",
    });
  };

  // Handler for updating (or creating) a reservation from the sidebar.
  const handleUpdateReservation = (updated: {
    id?: string;
    title: string;
    startTime: Date;
    endTime: Date;
    comment: string;
  }) => {
    if (updated.id && updated.id.trim() !== "") {
      // Existing reservation update with PUT.
      fetch(`/api/reservation/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: updated.title,
          startTime: updated.startTime,
          endTime: updated.endTime,
          comment: updated.comment,
        }),
      })
        .then((res) => res.json())
        .then(() => {
          setReservations((prev: EventInput[]) =>
            prev.map((e) =>
              e.id === updated.id
                ? {
                    ...e,
                    title: updated.title + (updated.comment ? " *" : ""),
                    start: updated.startTime,
                    end: updated.endTime,
                    comment: updated.comment,
                  }
                : e
            )
          );
          setSelectedReservation(null);
        })
        .catch((err) => console.error("Error updating reservation:", err));
    } else {
      // New reservation creation via POST.
      fetch("/api/reservation/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: updated.title,
          startTime: updated.startTime,
          endTime: updated.endTime,
          comment: updated.comment,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          const newEvent = {
            id: data.id,
            title: updated.title + (updated.comment ? " *" : ""),
            start: updated.startTime,
            end: updated.endTime,
            comment: updated.comment,
          };
          setReservations((prev) => [...prev, newEvent]);
          setSelectedReservation(null);
        })
        .catch((err) => console.error("Error creating reservation:", err));
    }
  };

  // Handler for deleting a reservation from the sidebar.
  const handleDeleteReservation = (id: string) => {
    if (id && id.trim() !== "") {
      fetch(`/api/reservation/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
        .then((res) => res.json())
        .then(() => {
          setReservations((prev: EventInput[]) => prev.filter((e) => e.id !== id));
          setSelectedReservation(null);
        })
        .catch((err) => console.error("Error deleting reservation:", err));
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-5xl bg-white rounded-lg shadow-xl p-6">
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-6">Reservation Calendar</h1>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            selectable={true}
            editable={true}
            events={reservations}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            height="auto"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            slotLabelContent={(args) => {
              if (args.date.getHours() === 0) {
                return "0am";
              }
              return args.text;
            }}
          />
        </div>
      </div>
      {selectedReservation && (
        <ReservationDetailSidebar
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onUpdate={handleUpdateReservation}
          onDelete={handleDeleteReservation}
        />
      )}
      <style jsx global>{`
        .fc {
          color: black;
        }
        .fc-toolbar * {
          color: black;
        }
        .fc .fc-daygrid-day-number,
        .fc .fc-scrollgrid-sync-table th,
        .fc .fc-scrollgrid-sync-table td,
        .fc .fc-daygrid-day-top {
          color: black;
        }
      `}</style>
    </>
  );
}