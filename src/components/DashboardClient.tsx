"use client";

import { useEffect, useState } from "react";
import TagFolderCard from "@/components/TagFolderCard";
import FuzzyTaskPanel from "@/components/FuzzyTaskPanel";
import type { Task } from "@/types";

export default function DashboardClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newTags, setNewTags] = useState("");

  async function load() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addTask() {
    if (!newTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setNewTitle("");
    setNewTags("");
    load();
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

  const groups = new Map<string, { colorKey: string; tasks: Task[] }>();
  for (const task of tasks) {
    const tagList = task.tags.length > 0 ? task.tags : [{ id: "none", name: "未分類", color_key: "gray", user_id: "", created_at: "" }];
    for (const tag of tagList) {
      if (!groups.has(tag.name)) groups.set(tag.name, { colorKey: tag.color_key, tasks: [] });
      groups.get(tag.name)!.tasks.push(task);
    }
  }

  return (
    <main className="flex-grow p-container-padding flex flex-col gap-card-gap">
      <div className="mb-2">
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
          こんにちは、今日もお疲れ様です！ ✨
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          タグごとにワークスペース分けされたタスク一覧です。
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-2xl p-4 card-shadow flex flex-col sm:flex-row gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="新しいタスク名"
              className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="タグ(カンマ区切り)"
              className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={addTask} className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap">
              + New Task
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...groups.entries()].map(([tagName, group]) => (
              <TagFolderCard
                key={tagName}
                tagName={tagName}
                colorKey={group.colorKey}
                tasks={group.tasks}
                onToggleDone={toggleDone}
              />
            ))}
            {groups.size === 0 && (
              <p className="text-on-surface-variant col-span-2">まだタスクがありません。上のフォームから作成しましょう。</p>
            )}
          </div>
        </section>

        <section className="xl:col-span-1">
          <FuzzyTaskPanel />
        </section>
      </div>
    </main>
  );
}
