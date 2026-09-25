import { SendPage } from "@/components/route-pages";
import { TaskDialog } from "@/components/task-dialog";

export default async function SendDialog(props: Parameters<typeof SendPage>[0]) {
  // Reuse the canonical route's query handling and member authorization.
  const screen = await SendPage(props);
  return <TaskDialog task="send">{screen}</TaskDialog>;
}
