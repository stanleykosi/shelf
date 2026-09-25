import { SavedSharePage } from "@/components/route-pages";
import { TaskDialog } from "@/components/task-dialog";

export default async function ShareDialog() {
  const screen = await SavedSharePage();
  return <TaskDialog task="share">{screen}</TaskDialog>;
}
