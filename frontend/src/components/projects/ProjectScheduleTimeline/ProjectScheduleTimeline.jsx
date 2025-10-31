import React, { useMemo, useState, useRef, useEffect } from "react";
import styles from "./ProjectScheduleTimeline.module.css";

function getMonthMeta(baseDate = new Date()) {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  const first = new Date(y, m, 1, 0, 0, 0, 0);
  const last = new Date(y, m + 1, 0, 23, 59, 59, 999);
  const days = last.getDate();
  const daysArray = Array.from({ length: days }, (_, i) => {
    const d = new Date(y, m, i + 1);
    return { label: d.getDate(), date: d, dow: d.getDay() };
  });
  return { year: y, monthIndex: m, first, last, days, daysArray };
}

function formatDDMMYYYY(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function ProjectScheduleTimeline({ tasks = [], members = [] }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [hideWeekends, setHideWeekends] = useState(false);

  const meta = useMemo(() => getMonthMeta(cursor), [cursor]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const visibleDays = useMemo(
    () =>
      hideWeekends
        ? meta.daysArray.filter((d) => d.dow !== 0 && d.dow !== 6)
        : meta.daysArray,
    [meta.daysArray, hideWeekends]
  );

  const tasksByUserByDate = useMemo(() => {
    const tmap = {};
    tasks.forEach((task) => {
      (task.assignee || []).forEach((a) => {
        const id = a._id || a.id || a;
        if (!tmap[id]) tmap[id] = {};
        const due = new Date(task.dueDate).setHours(0, 0, 0, 0);
        tmap[id][due] = tmap[id][due] || [];
        tmap[id][due].push(task);
      });
    });
    return tmap;
  }, [tasks]);

  const rows = useMemo(
    () =>
      members.map((user) => ({
        id: user._id,
        label: user.username || user.name || user.email || "Unnamed",
        avatar: user.avatar || null,
      })),
    [members]
  );

  const prevMonth = () =>
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const setMonth = (m) =>
    setCursor((d) => new Date(d.getFullYear(), Number(m), 1));
  const setYear = (y) => setCursor((d) => new Date(Number(y), d.getMonth(), 1));

  // For auto-scroll to today column
  const todayRef = useRef(null);
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [meta.monthIndex, meta.year, hideWeekends]);

  // Find index of today column
  const todayColIdx = visibleDays.findIndex(
    (d) => d.date.setHours(0, 0, 0, 0) === today
  );

  // Overlay Today Line Logic
  const gridRef = useRef();
  const [todayLineLeft, setTodayLineLeft] = useState(null);
  useEffect(() => {
    if (todayColIdx === -1) {
      setTodayLineLeft(null);
      return;
    }
    const grid = gridRef.current;
    if (!grid) return;
    // header cells = User cell + days
    const headerCells = grid.children;
    const todayCell = headerCells[todayColIdx + 1]; // +1 skips User cell
    if (!todayCell) {
      setTodayLineLeft(null);
      return;
    }
    const gridRect = grid.getBoundingClientRect();
    const cellRect = todayCell.getBoundingClientRect();
    const left = cellRect.left - gridRect.left + cellRect.width / 2;
    setTodayLineLeft(left);
  }, [todayColIdx, visibleDays.length, meta.year, meta.monthIndex, hideWeekends]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.left}>
          <button className={styles.navBtn} onClick={prevMonth}>
            ◀
          </button>
          <select
            className={styles.select}
            value={meta.monthIndex}
            onChange={(e) => setMonth(e.target.value)}
          >
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={meta.year}
            onChange={(e) => setYear(e.target.value)}
          >
            {Array.from({ length: 7 }, (_, i) => meta.year - 3 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button className={styles.navBtn} onClick={nextMonth}>
            ▶
          </button>
        </div>
        <label className={styles.chk}>
          <input
            type="checkbox"
            checked={hideWeekends}
            onChange={(e) => setHideWeekends(e.target.checked)}
          />
          Hide weekends
        </label>
      </div>

      {todayLineLeft !== null && (
        <div
          className={styles.verticalTodayLine}
          style={{ left: todayLineLeft }}
        />
      )}

      <div
        ref={gridRef}
        className={styles.grid}
        style={{
          gridTemplateColumns: `220px repeat(${visibleDays.length}, minmax(70px,1fr))`,
          position: "relative",
        }}
      >
        {/* Header */}
        <div className={styles.headerCell}>User</div>
        {visibleDays.map((d, i) => {
          return (
            <div
              key={d.date.toDateString()}
              className={`${styles.headerCell} ${d.dow === 0 || d.dow === 6 ? styles.weekend : ""}`}
              title={d.date.toDateString()}
              ref={i === todayColIdx ? todayRef : null}
            >
              <div className={styles.dayNum}>{d.label}</div>
              <div className={styles.dow}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.dow]}
              </div>
            </div>
          );
        })}

        {/* User rows */}
        {rows.length === 0 && (
          <>
            <div className={styles.rowLabel}>No team members found</div>
            <div
              className={styles.empty}
              style={{ gridColumn: `2 / span ${visibleDays.length}` }}
            />
          </>
        )}

        {rows.map((user) => (
          <React.Fragment key={user.id}>
            <div className={styles.rowLabel}>
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.label}
                  className={styles.avatar}
                />
              )}
              <span className={styles.title}>{user.label}</span>
            </div>
            {visibleDays.map((d, dayIdx) => {
              const dayTime = new Date(d.date).setHours(0, 0, 0, 0);
              const tasksOnThisDay =
                tasksByUserByDate[user.id]?.[dayTime] || [];
              const showTasks = tasksOnThisDay.slice(0, 2);
              const moreCount = tasksOnThisDay.length - showTasks.length;
              return (
                <div
                  key={`${user.id}-cell-${dayIdx}`}
                  className={styles.itemCell}
                >
                  {showTasks.map((task, idx) => {
                    const overdue =
                      new Date(task.dueDate).setHours(0, 0, 0, 0) < today &&
                      task.status !== "Completed";
                    const approaching =
                      new Date(task.dueDate).setHours(0, 0, 0, 0) >= today &&
                      (new Date(task.dueDate).setHours(0, 0, 0, 0) - today) / 86400000 <= 7 &&
                      task.status !== "Completed";
                    return (
                      <div
                        key={task._id + "-" + idx}
                        className={`${styles.item} ${overdue ? styles.overdue : approaching ? styles.approaching : styles.normal}`}
                        title={`Title: ${task.title}
Due: ${formatDDMMYYYY(task.dueDate)}
Status: ${task.status}
Priority: ${task.priority ?? "-"}
Click for details`}
                        onClick={() =>
                          window.open(`/tasks/${task._id}`, "_blank")
                        }
                        style={{
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span className={styles.hoverIcon}>ℹ️</span>
                        {task.title}
                      </div>
                    );
                  })}
                  {moreCount > 0 && (
                    <span className={styles.moreBadge}>+{moreCount} more</span>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}