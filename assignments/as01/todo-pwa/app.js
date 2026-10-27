"use strict";

/* =========================================================
   Constants
   ========================================================= */
const STORAGE_KEY = "todo-pwa.tasks";
const SORT_KEY = "todo-pwa.sort";
const FILTER_KEY = "todo-pwa.filter";

const PRIORITIES = ["High", "Medium", "Low"];
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
const SORT_FIELDS = ["priority", "project", "deadline", "contact", "location"];
const FILTERS = ["all", "active", "done"];

const MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

const EMPTY_MESSAGES = {
  none: "No tasks yet. Add your first one above!",
  all: "No tasks yet. Add your first one above!",
  active: "Nothing left to do. Nice work!",
  done: "No finished tasks yet. Tick a task when it's done.",
};

/* =========================================================
   Storage
   ========================================================= */

/** Reads the task array from localStorage. Returns [] if nothing is saved or the data is corrupt. */
function loadTasks() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    showStorageError("Your browser is blocking storage, so tasks cannot be loaded or saved.");
    return [];
  }
  if (raw === null) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Saved tasks are not an array");
    return parsed.map(normalizeTask).filter(Boolean);
  } catch (err) {
    console.warn("Saved tasks were unreadable, starting with an empty list.", err);
    // Keep a copy of the bad data so it is not lost when we next save.
    try {
      localStorage.setItem(STORAGE_KEY + ".corrupt-backup", raw);
    } catch (_) {
      /* ignore */
    }
    return [];
  }
}

/** Writes the task array to localStorage. Returns true on success. */
function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    hideStorageError();
    return true;
  } catch (err) {
    console.error("Could not save tasks.", err);
    showStorageError("Could not save your tasks. Storage may be full or blocked in this browser.");
    return false;
  }
}

function loadPreferences() {
  let sort = { field: "deadline", dir: "asc" };
  let filter = "all";
  try {
    const savedSort = JSON.parse(localStorage.getItem(SORT_KEY));
    if (savedSort && SORT_FIELDS.includes(savedSort.field) && ["asc", "desc"].includes(savedSort.dir)) {
      sort = { field: savedSort.field, dir: savedSort.dir };
    }
  } catch (_) {
    /* fall back to defaults */
  }
  try {
    const savedFilter = localStorage.getItem(FILTER_KEY);
    if (FILTERS.includes(savedFilter)) filter = savedFilter;
  } catch (_) {
    /* fall back to defaults */
  }
  return { sort, filter };
}

function savePreferences() {
  try {
    localStorage.setItem(SORT_KEY, JSON.stringify(state.sort));
    localStorage.setItem(FILTER_KEY, state.filter);
  } catch (_) {
    /* preferences are a convenience; ignore failures */
  }
}

/** Turns anything read from storage into a valid task object, or null if it has no title. */
function normalizeTask(item) {
  if (!item || typeof item !== "object") return null;
  const title = cleanText(item.title);
  if (!title) return null;
  return {
    id: typeof item.id === "string" && item.id ? item.id : newId(),
    title,
    priority: PRIORITIES.includes(item.priority) ? item.priority : "Medium",
    project: cleanText(item.project),
    deadline: parseDeadline(item.deadline) === null ? "" : item.deadline,
    contact: cleanText(item.contact),
    location: cleanText(item.location),
    done: item.done === true,
    createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
  };
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function newId() {
  // crypto.randomUUID only exists on https/localhost, so keep a fallback.
  if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* =========================================================
   Deadlines and countdown
   ========================================================= */

/** Parses a "YYYY-MM-DDTHH:mm" local-time string. Returns a timestamp (ms) or null. */
function parseDeadline(deadline) {
  if (typeof deadline !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(deadline)) return null;
  const time = new Date(deadline).getTime();
  return Number.isNaN(time) ? null : time;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Whole minutes between now and the deadline (negative when overdue), or null if there is no deadline. */
function minutesUntil(deadline, now = Date.now()) {
  const due = parseDeadline(deadline);
  if (due === null) return null;
  // Round to the nearest minute: deadlines have minute precision, so "tomorrow at this time" reads "1 day 0 hours".
  return Math.round((due - now) / MINUTE);
}

/** Returns text like "3 days 4 hours left", "Due now", "Overdue by 1 day 6 hours", or "No deadline". */
function timeRemaining(deadline, now = Date.now()) {
  const minutes = minutesUntil(deadline, now);
  if (minutes === null) return "No deadline";
  if (minutes >= 0 && minutes < MINUTES_PER_HOUR) return "Due now";

  const total = Math.abs(minutes);
  const days = Math.floor(total / MINUTES_PER_DAY);
  const hours = Math.floor((total % MINUTES_PER_DAY) / MINUTES_PER_HOUR);

  if (minutes < 0) {
    if (days === 0 && hours === 0) return "Overdue by less than 1 hour";
    return `Overdue by ${plural(days, "day")} ${plural(hours, "hour")}`;
  }
  return `${plural(days, "day")} ${plural(hours, "hour")} left`;
}

/** "none" | "overdue" | "soon" (under 24 h) | "ok" — used to colour the countdown. */
function deadlineStatus(deadline, now = Date.now()) {
  const minutes = minutesUntil(deadline, now);
  if (minutes === null) return "none";
  if (minutes < 0) return "overdue";
  if (minutes < MINUTES_PER_DAY) return "soon";
  return "ok";
}

function formatDeadline(deadline) {
  const due = parseDeadline(deadline);
  if (due === null) return "";
  return new Date(due).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* =========================================================
   Sorting and filtering
   ========================================================= */

function compareText(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

/** Compares two values where blank (null or "") always sorts last, regardless of direction. */
function compareBlanksLast(a, b, dir, compare) {
  const aBlank = a === null || a === "";
  const bBlank = b === null || b === "";
  if (aBlank && bBlank) return 0;
  if (aBlank) return 1;
  if (bBlank) return -1;
  return dir * compare(a, b);
}

function compareDeadlines(a, b, dir) {
  return compareBlanksLast(parseDeadline(a.deadline), parseDeadline(b.deadline), dir, (x, y) => x - y);
}

/** Returns a new sorted array. Ties are broken by deadline (soonest first), then title. */
function sortTasks(tasks, field, dirName) {
  const dir = dirName === "desc" ? -1 : 1;
  const primary = (a, b) => {
    if (field === "priority") return dir * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    if (field === "deadline") return compareDeadlines(a, b, dir);
    return compareBlanksLast(a[field], b[field], dir, compareText);
  };
  return [...tasks].sort(
    (a, b) =>
      primary(a, b) ||
      compareDeadlines(a, b, 1) ||
      compareText(a.title, b.title) ||
      a.createdAt - b.createdAt
  );
}

function filterTasks(tasks, filter) {
  if (filter === "active") return tasks.filter((t) => !t.done);
  if (filter === "done") return tasks.filter((t) => t.done);
  return tasks;
}

/* =========================================================
   App state and DOM
   ========================================================= */

const state = {
  tasks: [],
  sort: { field: "deadline", dir: "asc" },
  filter: "all",
  editingId: null,
};

const els = {};

function cacheElements() {
  const byId = (id) => document.getElementById(id);
  Object.assign(els, {
    form: byId("task-form"),
    formHeading: byId("form-heading"),
    title: byId("title"),
    titleError: byId("title-error"),
    priority: byId("priority"),
    project: byId("project"),
    deadline: byId("deadline"),
    contact: byId("contact"),
    location: byId("location"),
    submitBtn: byId("submit-btn"),
    cancelBtn: byId("cancel-edit-btn"),
    sortField: byId("sort-field"),
    sortDirBtn: byId("sort-dir-btn"),
    filterBtns: document.querySelectorAll(".filter-btn"),
    list: byId("task-list"),
    emptyMessage: byId("empty-message"),
    template: byId("task-template"),
    storageError: byId("storage-error"),
  });
}

function showStorageError(message) {
  if (!els.storageError) return;
  els.storageError.textContent = message;
  els.storageError.hidden = false;
}

function hideStorageError() {
  if (els.storageError) els.storageError.hidden = true;
}

/* ---------- Rendering ---------- */

function render() {
  renderToolbar();
  renderList();
}

function renderToolbar() {
  els.sortField.value = state.sort.field;
  const asc = state.sort.dir === "asc";
  els.sortDirBtn.textContent = asc ? "↑ Asc" : "↓ Desc";
  els.sortDirBtn.setAttribute("aria-label", `Sort direction: ${asc ? "ascending" : "descending"}. Click to reverse.`);

  const counts = {
    all: state.tasks.length,
    active: state.tasks.filter((t) => !t.done).length,
    done: state.tasks.filter((t) => t.done).length,
  };
  els.filterBtns.forEach((btn) => {
    const filter = btn.dataset.filter;
    btn.setAttribute("aria-pressed", String(filter === state.filter));
    btn.querySelector("[data-count]").textContent = counts[filter];
  });
}

function renderList() {
  const visible = sortTasks(filterTasks(state.tasks, state.filter), state.sort.field, state.sort.dir);
  const now = Date.now();

  const fragment = document.createDocumentFragment();
  visible.forEach((task) => fragment.appendChild(buildTaskElement(task, now)));
  els.list.replaceChildren(fragment);

  if (visible.length === 0) {
    els.emptyMessage.textContent = state.tasks.length === 0 ? EMPTY_MESSAGES.none : EMPTY_MESSAGES[state.filter];
    els.emptyMessage.hidden = false;
  } else {
    els.emptyMessage.hidden = true;
  }
}

/** Builds one <li> from the template. All user text goes in via textContent, never as HTML. */
function buildTaskElement(task, now) {
  const li = els.template.content.firstElementChild.cloneNode(true);
  li.dataset.id = task.id;
  li.dataset.priority = task.priority;
  li.classList.toggle("is-done", task.done);
  li.classList.toggle("is-editing", task.id === state.editingId);

  const checkbox = li.querySelector(".task-done");
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Mark "${task.title}" as ${task.done ? "not done" : "done"}`);

  li.querySelector(".task-title").textContent = task.title;

  const badge = li.querySelector(".priority-badge");
  badge.textContent = task.priority;
  badge.dataset.priority = task.priority;

  const countdown = li.querySelector(".countdown");
  if (task.done) {
    countdown.remove();
  } else {
    countdown.dataset.deadline = task.deadline;
    updateCountdownElement(countdown, now);
  }

  setMeta(li, "project", task.project);
  setMeta(li, "deadline", formatDeadline(task.deadline));
  setMeta(li, "contact", task.contact);
  setMeta(li, "location", task.location);

  li.querySelector('[data-action="edit"]').setAttribute("aria-label", `Edit "${task.title}"`);
  li.querySelector('[data-action="delete"]').setAttribute("aria-label", `Delete "${task.title}"`);
  return li;
}

function setMeta(li, field, value) {
  const dd = li.querySelector(`[data-field="${field}"]`);
  dd.textContent = value || "—";
  dd.classList.toggle("is-empty", !value);
}

function updateCountdownElement(el, now) {
  const deadline = el.dataset.deadline;
  const status = deadlineStatus(deadline, now);
  el.textContent = timeRemaining(deadline, now);
  el.classList.toggle("is-overdue", status === "overdue");
  el.classList.toggle("is-soon", status === "soon");
  el.classList.toggle("is-none", status === "none");
}

/** Refreshes just the countdown text and colours, without rebuilding the list. */
function updateCountdowns() {
  const now = Date.now();
  els.list.querySelectorAll(".countdown").forEach((el) => updateCountdownElement(el, now));
}

/* ---------- Form ---------- */

function readForm() {
  return {
    title: els.title.value.trim(),
    priority: PRIORITIES.includes(els.priority.value) ? els.priority.value : "Medium",
    project: els.project.value.trim(),
    deadline: parseDeadline(els.deadline.value) === null ? "" : els.deadline.value,
    contact: els.contact.value.trim(),
    location: els.location.value.trim(),
  };
}

function setTitleError(show) {
  els.titleError.hidden = !show;
  if (show) els.title.setAttribute("aria-invalid", "true");
  else els.title.removeAttribute("aria-invalid");
}

function handleSubmit(event) {
  event.preventDefault();
  const data = readForm();
  if (!data.title) {
    setTitleError(true);
    els.title.focus();
    return;
  }
  setTitleError(false);

  const existing = state.editingId && state.tasks.find((t) => t.id === state.editingId);
  if (existing) {
    Object.assign(existing, data);
  } else {
    state.tasks.push({ id: newId(), ...data, done: false, createdAt: Date.now() });
  }
  saveTasks(state.tasks);
  resetForm();
  render();
  els.title.focus();
}

function startEditing(task) {
  state.editingId = task.id;
  els.title.value = task.title;
  els.priority.value = task.priority;
  els.project.value = task.project;
  els.deadline.value = task.deadline;
  els.contact.value = task.contact;
  els.location.value = task.location;
  els.formHeading.textContent = "Edit task";
  els.submitBtn.textContent = "Save changes";
  els.cancelBtn.hidden = false;
  setTitleError(false);
  render();
  els.form.scrollIntoView({ behavior: "smooth", block: "start" });
  els.title.focus({ preventScroll: true });
}

function resetForm() {
  state.editingId = null;
  els.form.reset();
  els.priority.value = "Medium";
  els.formHeading.textContent = "Add task";
  els.submitBtn.textContent = "Add task";
  els.cancelBtn.hidden = true;
  setTitleError(false);
}

function cancelEditing() {
  resetForm();
  render();
}

/* ---------- Task actions ---------- */

function findTask(id) {
  return state.tasks.find((t) => t.id === id);
}

function toggleDone(id, done) {
  const task = findTask(id);
  if (!task) return;
  task.done = done;
  saveTasks(state.tasks);
  render();
}

function deleteTask(id) {
  const task = findTask(id);
  if (!task) return;
  if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveTasks(state.tasks);
  if (state.editingId === id) resetForm();
  render();
}

function handleListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.closest(".task").dataset.id;
  if (button.dataset.action === "edit") {
    const task = findTask(id);
    if (task) startEditing(task);
  } else if (button.dataset.action === "delete") {
    deleteTask(id);
  }
}

function handleListChange(event) {
  if (!event.target.classList.contains("task-done")) return;
  const id = event.target.closest(".task").dataset.id;
  toggleDone(id, event.target.checked);
}

/* ---------- Toolbar ---------- */

function handleSortFieldChange() {
  if (!SORT_FIELDS.includes(els.sortField.value)) return;
  state.sort.field = els.sortField.value;
  savePreferences();
  render();
}

function handleSortDirClick() {
  state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
  savePreferences();
  render();
}

function handleFilterClick(event) {
  const filter = event.currentTarget.dataset.filter;
  if (!FILTERS.includes(filter)) return;
  state.filter = filter;
  savePreferences();
  render();
}

/* =========================================================
   Start-up
   ========================================================= */

function init() {
  cacheElements();
  state.tasks = loadTasks();
  Object.assign(state, loadPreferences());

  els.form.addEventListener("submit", handleSubmit);
  els.title.addEventListener("input", () => {
    if (els.title.value.trim()) setTitleError(false);
  });
  els.cancelBtn.addEventListener("click", cancelEditing);
  els.form.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.editingId) cancelEditing();
  });
  els.list.addEventListener("click", handleListClick);
  els.list.addEventListener("change", handleListChange);
  els.sortField.addEventListener("change", handleSortFieldChange);
  els.sortDirBtn.addEventListener("click", handleSortDirClick);
  els.filterBtns.forEach((btn) => btn.addEventListener("click", handleFilterClick));

  // Keep other open tabs of the app in sync.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state.tasks = loadTasks();
    if (state.editingId && !findTask(state.editingId)) resetForm();
    render();
  });

  // Live countdown: refresh every minute, and straight away when the app comes back into view.
  setInterval(updateCountdowns, MINUTE);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") updateCountdowns();
  });

  render();
  registerServiceWorker();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

init();
