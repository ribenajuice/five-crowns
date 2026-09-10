import { redirect } from "next/navigation";

/**
 * The landing screen past the password gate is the games list, until the
 * records board exists in Milestone 3.
 */
export default function Home() {
  redirect("/games");
}
