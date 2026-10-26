import { LayoutGrid, List, UserPlus } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { kanbanData } from "@/modules/crm/queries";
import Kanban from "@/modules/crm/components/Kanban";
import { CHASE_BUCKETS, CHASE_LANE, STAGE_LANE, STAGES } from "@/modules/crm/constants";
import { LinkButton, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  await requireStaff();
  const k = await kanbanData();
  return (
    <div>
      <PageHeader
        icon={<LayoutGrid />}
        title="Pipeline"
        description="Drag cards between columns to change the stage (Pipeline) or chasing bucket (Unsuccessful & Archive)."
        actions={
          <>
            <LinkButton href="/admin/cases" variant="secondary"><List /> Cases list</LinkButton>
            <LinkButton href="/admin/cases/new" variant="primary" className="sm:hidden"><UserPlus /> New client</LinkButton>
          </>
        }
      />
      <Kanban alwaysShow pipeline={k.pipeline} lost={k.lost} stages={STAGES} chase={CHASE_BUCKETS} stageLanes={STAGE_LANE} chaseLanes={CHASE_LANE} />
    </div>
  );
}
