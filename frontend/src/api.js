const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body.detail) ? "please check the form fields" : body.detail;
    throw new Error(detail || "something went wrong");
  }
  return body;
}

export const api = {
  doctors: () => request("/doctors"),
  list: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request("/appointments" + (query ? "?" + query : ""));
  },
  stats: (day) => request("/appointments/stats?day=" + day),
  create: (data) => request("/appointments", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request("/appointments/" + id, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => request("/appointments/" + id, { method: "DELETE" }),
};
