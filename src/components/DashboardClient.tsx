"use client";

import { useEffect, useState } from "react";
import TagFolderCard from "@/components/TagFolderCard";
import FuzzyTaskPanel from "@/components/FuzzyTaskPanel";
import TagPicker from "@/components/TagPicker";
import TaskDetailModal from "@/components/TaskDetailModal";
import type { Tag, Task } from "@/types";

const UNTAGGED_KEY = "__untagged__";
type StatusFilter = "all" | "active" | "done";

export default function DashboardClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTagId, setDraggedTagId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  async function loadTasks() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }

  async function loadTags() {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data.tags ?? []);
  }

  useEffect(() => {
    loadTasks();
    loadTags();
  }, []);

  async function addTask() {
    if (!newTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, tags: newTags }),
    });
    setNewTitle("");
    setNewTags([]);
    loadTasks();
    loadTags();
  }

  async function toggleDone(taskId: string, done: boolean) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: done ? "done" : "todo" } : t))
    );
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: done ? "done" : "todo" }),
    });
  }

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "done") return t.status === "done";
    return t.status !== "done";
  });

  const tasksByTagName = new Map<string, Task[]>();
  for (const task of filteredTasks) {
    const tagList = task.tags.length > 0 ? task.tags.map((t) => t.name) : [UNTAGGED_KEY];
    for (const tagName of tagList) {
      if (!tasksByTagName.has(tagName)) tasksByTagName.set(tagName, []);
      tasksByTagName.get(tagName)!.push(task);
    }
  }

  const untaggedCount = tasksByTagName.get(UNTAGGED_KEY)?.length ?? 0;

  function handleDrop(targetTagId: string) {
    if (!draggedTagId || draggedTagId === targetTagId) return;
    setTags((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((t) => t.id === draggedTagId);
      const toIndex = next.findIndex((t) => t.id === targetTagId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      fetch("/api/tags/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: next.map((t) => t.id) }),
      });

      return next;
    });
    setDraggedTagId(null);
  }

  return (
    <main className="flex-grow p-container-padding flex flex-col gap-card-gap">
      <div className="mb-2">
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
          こんにちは、今日もお疲れ様です！ ✨
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          タグごとにワークスペース分けされたタスク一覧です。カード左のハンドルをドラッグして並び替えられます。
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-2xl p-4 card-shadow flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="新しいタスク名"
                className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={addTask} className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap">
                + New Task
              </button>
            </div>
            <TagPicker value={newTags} onChange={setNewTags} />
          </div>

          <div className="flex gap-2 items-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant mr-1">フィルター:</span>
            {([
              { key: "active", label: "未対応" },
              { key: "all", label: "すべて" },
              { key: "done", label: "完了" },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
                  statusFilter === f.key
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container text-on-surface hover:bg-primary-container hover:text-on-primary-container border border-outline-variant/30"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {tags.map((tag) => (
              <div
                key={tag.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(tag.id)}
                className={draggedTagId === tag.id ? "opacity-40" : ""}
              >
                <TagFolderCard
                  tagName={tag.name}
                  colorKey={tag.color_key}
                  tasks={tasksByTagName.get(tag.name) ?? []}
                  onToggleDone={toggleDone}
                  onSelectTask={setSelectedTask}
                  dragHandleProps={{
                    draggable: true,
                    onDragStart: () => setDraggedTagId(tag.id),
                    onDragEnd: () => setDraggedTagId(null),
                  }}
                />
              </div>
            ))}
            {untaggedCount > 0 && (
              <TagFolderCard
                tagName="未分類"
                colorKey="gray"
                tasks={tasksByTagName.get(UNTAGGED_KEY) ?? []}
                onToggleDone={toggleDone}
                onSelectTask={setSelectedTask}
              />
            )}
            {tags.length === 0 && untaggedCount === 0 && (
              <p className="text-on-surface-variant col-span-2">まだタスクがありません。上のフォームから作成しましょう。</p>
            )}
          </div>
        </section>

        <section className="xl:col-span-1">
          <FuzzyTaskPanel />
        </section>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSaved={() => {
            setSelectedTask(null);
            loadTasks();
          }}
          onDeleted={() => {
            setSelectedTask(null);
            loadTasks();
          }}
        />
      )}
    </main>
  );
}
