"use client";

import { useEffect, useState } from "react";
import type { Tag } from "@/types";

export default function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => setAvailableTags(data.tags ?? []));
  }, []);

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  const unselectedExisting = availableTags.filter((t) => !value.includes(t.name));

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1 bg-primary-container text-on-primary-container text-xs font-bold px-3 py-1 rounded-full"
            >
              {name}
              <button type="button" onClick={() => removeTag(name)} className="hover:opacity-70">
                <span className="material-symbols-outlined text-[14px] align-middle">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {unselectedExisting.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addTag(e.target.value);
            }}
            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2 py-2 text-sm"
          >
            <option value="">既存タグから選択...</option>
            {unselectedExisting.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <input
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(newTagInput);
              setNewTagInput("");
            }
          }}
          placeholder="新しいタグ名を入力しEnter"
          className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
