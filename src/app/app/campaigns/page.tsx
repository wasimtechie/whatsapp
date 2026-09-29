import { redirect } from "next/navigation";

/** Legacy path — campaigns live under Broadcasts */
export default function CampaignsRedirect() {
  redirect("/app/broadcasts");
}
