'use client';

import { useState } from "react";

interface ReservationDetailSidebarProps {
  reservation: {
    id?: string; // empty string or undefined for new reservations
    title: string;
    start: string | Date;
    end: string | Date;
    comment?: string;
  };
  onClose: () => void;
  onUpdate: (updated: {
    id?: string;
    title: string;
    startTime: Date;
    endTime: Date;
    comment: string;
  }) => void;
  onDelete: (id: string) => void;
}

// Helper to format a Date as local datetime string for datetime-local inputs.
const formatLocalDateTime = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

export default function ReservationDetailSidebar({
  reservation,
  onClose,
  onUpdate,
  onDelete,
}: ReservationDetailSidebarProps) {
  const baseTitle = reservation.title.split(" (")[0];
  const [title, setTitle] = useState(baseTitle || "");
  const [comment, setComment] = useState(reservation.comment || "");
  const [startTime, setStartTime] = useState(new Date(reservation.start));
  const [endTime, setEndTime] = useState(new Date(reservation.end));

  const handleUpdate = () => {
    onUpdate({
      id: reservation.id,
      title,
      comment,
      startTime,
      endTime,
    });
  };

  const handleDelete = () => {
    if (reservation.id && confirm("Are you sure you want to delete this reservation?")) {
      onDelete(reservation.id);
    }
  };

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-lg p-6 z-50 text-black">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Reservation Details</h2>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-2xl">
          &times;
        </button>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full border p-2 rounded-md text-black"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="mt-1 block w-full border p-2 rounded-md text-black"
        ></textarea>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Start Time</label>
        <input
          type="datetime-local"
          value={formatLocalDateTime(startTime)}
          onChange={(e) => setStartTime(new Date(e.target.value))}
          className="mt-1 block w-full border p-2 rounded-md text-black"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">End Time</label>
        <input
          type="datetime-local"
          value={formatLocalDateTime(endTime)}
          onChange={(e) => setEndTime(new Date(e.target.value))}
          className="mt-1 block w-full border p-2 rounded-md text-black"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={handleUpdate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {reservation.id ? "Update" : "Create"}
        </button>
        {reservation.id && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}