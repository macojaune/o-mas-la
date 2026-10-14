import { Redirect, useLocalSearchParams } from "expo-router"

/** Deep links join the persistent discovery map instead of opening a second map. */
export default function GroupEntry() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <Redirect href={{ pathname: "/", params: { groupId: id } }} />
}
