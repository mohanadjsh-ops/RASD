"use client";

import { useEffect, useState, useTransition } from "react";

type UserRow = {
  id: string;
  email?: string;
  created_at: string;
  profile: {
    full_name: string | null;
    role: "admin" | "viewer";
  } | null;
};

export function UsersAdmin({ labels }: { labels: Record<string, string> }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    const response = await fetch("/api/admin/users");
    if (response.ok) setUsers(await response.json());
  }

  function createUser(formData: FormData) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          password: formData.get("password"),
          role: formData.get("role")
        })
      });
      if (response.ok) {
        setMessage(labels.save);
        await loadUsers();
      } else {
        const result = await response.json();
        setMessage(result.error ?? labels.error);
      }
    });
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-950">{labels.users}</h1>
      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
        <form action={createUser} className="rounded-md border border-line bg-panel p-5 shadow-sm shadow-slate-200">
          <label className="block text-sm font-medium text-slate-700">
            {labels.fullName}
            <input name="fullName" required className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            {labels.email}
            <input name="email" type="email" required className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            {labels.password}
            <input name="password" type="password" required className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            {labels.role}
            <select name="role" className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric">
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <button disabled={pending} className="mt-5 rounded-md bg-electric px-4 py-2 font-semibold text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified disabled:opacity-50">
            {labels.createUser}
          </button>
          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        </form>
        <div className="overflow-hidden rounded-md border border-line bg-panel shadow-sm shadow-slate-200">
          {users.length ? (
            users.map((user) => (
              <div key={user.id} className="grid gap-2 border-b border-line p-4 text-sm last:border-0 md:grid-cols-4">
                <span className="font-medium text-slate-950">{user.profile?.full_name ?? "-"}</span>
                <span>{user.email}</span>
                <span>{user.profile?.role ?? "viewer"}</span>
                <span>{new Date(user.created_at).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="p-6 text-slate-500">{labels.empty}</p>
          )}
        </div>
      </div>
    </section>
  );
}
