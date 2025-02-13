"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Task {
  ID: number;
  OwnerEmail: string;
  Title: string;
  Completed: boolean;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"working" | "completed">("working");

  // Fetch tasks for the authenticated user
  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks/", {
        credentials: "include", // Send cookies so backend can validate JWT
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      } else {
        setError("Failed to fetch tasks");
      }
    } catch (err) {
      setError("Error fetching tasks");
      console.error(err);
    }
  };

  // Create a new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      const res = await fetch("/api/tasks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Send cookies
        body: JSON.stringify({ title: newTask }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [...prev, data.task]);
        setNewTask("");
      } else {
        setError("Failed to add task");
      }
    } catch (err) {
      setError("Error adding task");
      console.error(err);
    }
  };

  // Delete a task from the list
  const handleDeleteTask = async (id: number) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((task) => task.ID !== id));
      } else {
        setError("Failed to delete task");
      }
    } catch (err) {
      setError("Error deleting task");
      console.error(err);
    }
  };

  // Start editing a task
  const startEditing = (id: number, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  // Cancel editing a task
  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  // Submit updated task title
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null || !editingTitle.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ title: editingTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) =>
          prev.map((task) => (task.ID === editingId ? data.task : task))
        );
        cancelEditing();
      } else {
        setError("Failed to update task");
      }
    } catch (err) {
      setError("Error updating task");
      console.error(err);
    }
  };

  // Toggle completed flag
  const toggleCompleted = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ completed: !task.Completed }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.ID === task.ID ? data.task : t))
        );
      } else {
        setError("Failed to update task");
      }
    } catch (err) {
      setError("Error updating task");
      console.error(err);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter tasks based on activeTab
  const filteredTasks = tasks.filter((task) =>
    activeTab === "working" ? !task.Completed : task.Completed
  );

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-900 to-blue-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-black bg-opacity-50 rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Task Manager</h1>
        {error && <p className="mb-4 text-center text-red-500">{error}</p>}
        <form onSubmit={handleAddTask} className="flex gap-4 mb-6">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Enter new task"
            required
            className="flex-grow p-2 rounded-md text-black"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition"
          >
            Add Task
          </button>
        </form>
        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={() => setActiveTab("working")}
            disabled={activeTab === "working"}
            className={`px-4 py-2 rounded-md transition ${
              activeTab === "working"
                ? "bg-blue-600"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            Working Tasks
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            disabled={activeTab === "completed"}
            className={`px-4 py-2 rounded-md transition ${
              activeTab === "completed"
                ? "bg-green-600"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            Completed Tasks
          </button>
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-center">
          {activeTab === "working" ? "Working Tasks" : "Completed Tasks"}
        </h2>
        {filteredTasks && filteredTasks.length > 0 ? (
          <ul className="space-y-4">
            {filteredTasks.map((task) => (
              <li
                key={task.ID}
                className="flex items-center justify-between bg-gray-800 bg-opacity-50 p-4 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.Completed}
                    onChange={() => toggleCompleted(task)}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  {editingId === task.ID ? (
                    <form onSubmit={handleEditTask} className="flex gap-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="p-2 rounded-md text-black"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <span>{task.Title}</span>
                  )}
                </div>
                {editingId !== task.ID && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditing(task.ID, task.Title)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.ID)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center mt-4">No tasks available</p>
        )}
        <p className="mt-6 text-center">
          <Link
            href="/dashboard/"
            className="text-blue-500 underline"
          >
            Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
