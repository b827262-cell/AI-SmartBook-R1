export interface StudentProfile {
  name: string;
  points: number;
}

/**
 * Read the lightweight student profile (name + points) from localStorage.
 * Mirrors StudentHeader's keys so the reader top bar shows consistent values
 * without coupling to the global header component.
 */
export function readStudentProfile(): StudentProfile {
  if (typeof window === "undefined") return { name: "學員", points: 0 };

  const rawName =
    window.localStorage.getItem("smartbook.student.name") ||
    window.localStorage.getItem("studentName") ||
    "";
  const rawPoints =
    window.localStorage.getItem("smartbook.student.points") ||
    window.localStorage.getItem("studentPoints") ||
    "";
  const points = Number.parseInt(rawPoints, 10);

  return {
    name: rawName.trim() || "學員",
    points: Number.isFinite(points) ? points : 0
  };
}
