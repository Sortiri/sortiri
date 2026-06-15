import { LessonDetailPage } from "@/components/lessons/lesson-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <LessonDetailPage lessonId={id} />;
}
