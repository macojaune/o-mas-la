import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import GroupMap from "~/components/group-map"
import GroupRow from "~/components/group-row"
import { useCatalog } from "~/lib/catalog"
import { normalizeSearch } from "~/lib/catalog-model"
import { Button, Icon, Label, Notice, styles, usePalette } from "~/theme/ui"
import logoImage from "../../assets/logo.png"

export default function PublicHome() {
  const c = usePalette()
  const router = useRouter()
  const catalog = useCatalog()
  const [search, setSearch] = useState("")
  const [mode, setMode] = useState<"list" | "map">("list")
  const groups = useMemo(
    () =>
      catalog.data?.groups
        .filter((group) =>
          normalizeSearch(group.title).includes(normalizeSearch(search)),
        )
        .sort((a, b) => a.title.localeCompare(b.title, "fr")) ?? [],
    [catalog.data, search],
  )
  const data = catalog.data
  const open = (id: string) =>
    router.push({ pathname: "/group/[id]", params: { id } })
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={[s.header, { borderBottomColor: c.line }]}>
        <Image
          source={logoImage}
          style={s.logo}
          resizeMode="contain"
          accessibilityLabel="O Mas La ?"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mon espace"
          onPress={() => router.push("/account")}
          style={[s.account, { backgroundColor: c.surface }]}
        >
          <Icon name="person" color={c.ink} />
        </Pressable>
      </View>
      <View style={[styles.content, { paddingBottom: 12, gap: 16 }]}>
        <View style={{ gap: 8 }}>
          <Label accessibilityRole="header" style={styles.title}>
            Où est ton groupe ?
          </Label>
          <Label muted>Retrouve le mas, au bon endroit.</Label>
        </View>
        <View
          style={[
            s.search,
            { backgroundColor: c.surface, borderColor: c.line },
          ]}
        >
          <Icon name="search" color={c.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Rechercher un groupe"
            placeholder="Le nom de ton groupe"
            placeholderTextColor={c.muted}
            style={[s.searchInput, { color: c.ink }]}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
              onPress={() => setSearch("")}
              hitSlop={12}
            >
              <Icon name="close" color={c.muted} size={18} />
            </Pressable>
          )}
        </View>
        {catalog.offline && (
          <Notice tone="warning">
            Hors ligne
            {catalog.savedAt
              ? ` · données chargées à ${new Date(catalog.savedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : " · aucune donnée chargée pour le moment"}
            . Les positions continuent de vieillir.
          </Notice>
        )}
        {catalog.error && <Notice tone="warning">{catalog.error}</Notice>}
        <View style={styles.row}>
          <View
            accessibilityRole="tablist"
            style={[
              s.tabs,
              { backgroundColor: c.surface, borderColor: c.line },
            ]}
          >
            {(["list", "map"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === value }}
                onPress={() => setMode(value)}
                style={[
                  s.tab,
                  { backgroundColor: mode === value ? c.ink : "transparent" },
                ]}
              >
                <Icon
                  name={value}
                  color={mode === value ? c.background : c.muted}
                  size={18}
                />
                <Label
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: mode === value ? c.background : c.muted,
                  }}
                >
                  {value === "list" ? "Liste" : "Carte"}
                </Label>
              </Pressable>
            ))}
          </View>
          <Label muted style={{ marginLeft: "auto", fontSize: 13 }}>
            {catalog.data
              ? `${groups.length} groupe${groups.length > 1 ? "s" : ""}`
              : ""}
          </Label>
        </View>
      </View>
      {mode === "map" && catalog.data ? (
        <GroupMap
          catalog={{ ...catalog.data, groups }}
          now={catalog.now}
          onSelect={(group) => open(group.id)}
        />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingTop: 0, paddingBottom: 36 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={catalog.refreshing}
              onRefresh={catalog.refresh}
              tintColor={c.primary}
              enabled={!catalog.offline}
            />
          }
        >
          {!catalog.loaded && (
            <ActivityIndicator
              color={c.primary}
              style={{ marginTop: 40 }}
              accessibilityLabel="Chargement des groupes"
            />
          )}
          {catalog.loaded && groups.length === 0 && (
            <View style={s.empty}>
              <Icon name="search" color={c.muted} size={32} />
              <Label style={styles.heading}>
                {search
                  ? "Aucun groupe à ce nom"
                  : catalog.offline
                    ? "Une connexion pour commencer"
                    : catalog.error
                      ? "Les groupes sont indisponibles"
                      : "Les groupes arrivent ici"}
              </Label>
              <Label muted style={{ textAlign: "center" }}>
                {search
                  ? "Essaie un autre nom ou efface ta recherche."
                  : catalog.offline
                    ? "Charge une première fois la liste pour la retrouver ensuite hors ligne."
                    : catalog.error
                      ? "Réessaie la connexion au suivi pour charger la liste."
                      : "Dès qu’ils seront référencés, tu pourras les retrouver, même sans position."}
              </Label>
              {search ? (
                <Button
                  title="Voir tous les groupes"
                  variant="secondary"
                  onPress={() => setSearch("")}
                />
              ) : (
                <Button
                  title="Actualiser"
                  variant="secondary"
                  busy={catalog.refreshing}
                  disabled={catalog.offline}
                  onPress={catalog.refresh}
                />
              )}
            </View>
          )}
          {data && groups.length > 0 && (
            <View>
              {groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  catalog={data}
                  now={catalog.now}
                  onPress={() => open(group.id)}
                />
              ))}
              <Label
                muted
                style={{ fontSize: 12, lineHeight: 18, marginTop: 24 }}
              >
                Un groupe présent dans la liste n’est pas forcément suivi
                aujourd’hui.
              </Label>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
const s = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  logo: { width: 116, height: 44 },
  account: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  searchInput: { flex: 1, fontSize: 16, minHeight: 54 },
  tabs: { flexDirection: "row", padding: 4, borderRadius: 14, borderWidth: 1 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 42,
  },
  empty: { paddingVertical: 44, alignItems: "center", gap: 18 },
})
