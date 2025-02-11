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
    <div className="container">
      <h1>Task Manager</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleAddTask}>
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Enter new task"
          required
        />
        <button type="submit">Add Task</button>
      </form>

      <div style={{ marginTop: "20px" }}>
        <button onClick={() => setActiveTab("working")} disabled={activeTab === "working"}>
          Working Tasks
        </button>
        <button onClick={() => setActiveTab("completed")} disabled={activeTab === "completed"}>
          Completed Tasks
        </button>
      </div>

      <h2 style={{ marginTop: "20px" }}>
        {activeTab === "working" ? "Working Tasks" : "Completed Tasks"}
      </h2>
      {filteredTasks && filteredTasks.length > 0 ? (
        <ul>
          {filteredTasks.map((task) => (
            <li key={task.ID}>
              <input
                type="checkbox"
                checked={task.Completed}
                onChange={() => toggleCompleted(task)}
              />{" "}
              {editingId === task.ID ? (
                <form onSubmit={handleEditTask} style={{ display: "inline" }}>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={cancelEditing}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  {task.Title}{" "}
                  <button onClick={() => startEditing(task.ID, task.Title)}>
                    Edit
                  </button>{" "}
                  <button onClick={() => handleDeleteTask(task.ID)}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No tasks available</p>
      )}
      <p style={{ marginTop: "20px" }}>
        <Link href="/dashboard/">Back to Dashboard</Link>
      </p>
    </div>
  );
}
