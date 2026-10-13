import { auth } from "@oyo/auth"

import { OperationsConsole } from "./operations-console"

export const dynamic = "force-dynamic"

export default async function AdministrationPage() {
  const session = await auth()
  return <OperationsConsole signedIn={Boolean(session?.user)} />
}
