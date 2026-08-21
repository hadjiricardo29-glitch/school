import { supabase } from "@/services/supabase";
import type { Course, CourseEnrollment } from "@/types/domain";

export async function listPublishedCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function getCourse(id: string): Promise<Course | null> {
  const { data, error } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Course | null;
}

export async function getMyEnrollments(userId: string): Promise<CourseEnrollment[]> {
  const { data, error } = await supabase.from("course_enrollments").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as CourseEnrollment[];
}

export async function purchaseCourse(courseId: string): Promise<void> {
  const { error } = await supabase.rpc("purchase_course", { p_course_id: courseId });
  if (error) throw error;
}
