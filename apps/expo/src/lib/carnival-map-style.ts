import type { StyleSpecification } from "@maplibre/maplibre-react-native"

/** Insert measured building volumes below the first label layer. */
export const BUILDING_BEFORE_LAYER_ID = "carnival-road-labels"

const source = "plan-ign"
const regular = ["Source Sans Pro Regular"]
const bold = ["Source Sans Pro Bold"]

/** Real IGN geometry; the palette changes, never the streets or coastlines. */
export function createCarnivalMapStyle(
  dark: boolean,
  relief = true,
): StyleSpecification {
  const c = dark
    ? {
        land: "#202d31",
        sand: "#38433f",
        green: "#314c43",
        mangrove: "#264c46",
        water: "#0b3943",
        shallows: "#24535a",
        road: "#546367",
        roadEdge: "#26363a",
        path: "#879088",
        ink: "#e4ece7",
        quietInk: "#c7d8d3",
        waterInk: "#b6e1dd",
        building: "#728185",
      }
    : {
        land: "#eee9df",
        sand: "#e5d9bd",
        green: "#c2cdae",
        mangrove: "#a6bda4",
        water: "#14727b",
        shallows: "#74a9a5",
        road: "#fffdf7",
        roadEdge: "#d3cdbf",
        path: "#f9f5e9",
        ink: "#26494c",
        quietInk: "#496260",
        waterInk: "#f2fcf8",
        building: "#eee3cb",
      }

  return {
    version: 8,
    name: dark
      ? "O Mas La · Nuit à Pointe-à-Pitre"
      : "O Mas La · Ville calcaire",
    glyphs:
      "https://data.geopf.fr/annexes/ressources/vectorTiles/fonts/{fontstack}/{range}.pbf",
    sources: {
      [source]: {
        type: "vector",
        tiles: ["https://data.geopf.fr/tms/1.0.0/PLAN.IGN/{z}/{x}/{y}.pbf"],
        scheme: "xyz",
        minzoom: 0,
        maxzoom: 18,
        attribution:
          '<a href="https://www.data.gouv.fr/datasets/plan-ign">© IGN · Plan IGN / BD TOPO</a>',
      },
    },
    layers: [
      {
        id: "carnival-background",
        type: "background",
        paint: { "background-color": c.land },
      },
      {
        id: "carnival-land",
        type: "fill",
        source,
        "source-layer": "fond_opaque",
        paint: { "fill-color": c.land },
      },
      {
        id: "carnival-vegetation",
        type: "fill",
        source,
        "source-layer": "ocs_vegetation_surf",
        paint: { "fill-color": c.green },
      },
      {
        id: "carnival-mangrove",
        type: "fill",
        source,
        "source-layer": "ocs_vegetation_surf",
        filter: ["==", "symbo", "ZONE_MANGROVE"],
        paint: { "fill-color": c.mangrove },
      },
      {
        id: "carnival-sand",
        type: "fill",
        source,
        "source-layer": "ocs_nature_sol_surf",
        filter: ["in", "symbo", "ZONE_SABLE_SEC", "ZONE_SABLE_HUMIDE"],
        paint: { "fill-color": c.sand },
      },
      {
        id: "carnival-water",
        type: "fill",
        source,
        "source-layer": "hydro_surf",
        filter: [
          "in",
          "symbo",
          "ZONE_MARINE",
          "SURFACE_D_EAU",
          "SURFACE_D_EAU_TEMP",
          "BASSIN",
          "LAGON",
        ],
        paint: { "fill-color": c.water },
      },
      {
        id: "carnival-tidal-shore",
        type: "fill",
        source,
        "source-layer": "hydro_surf",
        filter: ["==", "symbo", "ZONE_D_ESTRAN"],
        paint: { "fill-color": c.shallows },
      },
      {
        id: "carnival-waterways",
        type: "line",
        source,
        "source-layer": "hydro_reseau",
        paint: {
          "line-color": c.water,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 18, 4],
        },
      },
      {
        id: "carnival-road-surfaces",
        type: "fill",
        source,
        "source-layer": "routier_surf",
        paint: { "fill-color": c.road },
      },
      {
        id: "carnival-paths",
        type: "line",
        source,
        "source-layer": "routier_chemin",
        minzoom: 14,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": c.path,
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 1, 18, 5],
        },
      },
      {
        id: "carnival-road-edges",
        type: "line",
        source,
        "source-layer": "routier_route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": c.roadEdge,
          "line-width": [
            "interpolate",
            ["exponential", 1.4],
            ["zoom"],
            10,
            1.5,
            14,
            3.5,
            16,
            7,
            18,
            18,
          ],
        },
      },
      {
        id: "carnival-roads",
        type: "line",
        source,
        "source-layer": "routier_route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": c.road,
          "line-width": [
            "interpolate",
            ["exponential", 1.4],
            ["zoom"],
            10,
            0.5,
            14,
            2,
            16,
            5,
            18,
            15,
          ],
        },
      },
      {
        id: "carnival-bridge-edges",
        type: "line",
        source,
        "source-layer": "routier_route_sup",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": c.roadEdge,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2, 18, 18],
        },
      },
      {
        id: "carnival-bridges",
        type: "line",
        source,
        "source-layer": "routier_route_sup",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": c.road,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 18, 15],
        },
      },
      {
        id: "carnival-buildings",
        type: "fill-extrusion",
        source,
        "source-layer": "bati_surf",
        minzoom: 14,
        // IGN heights are measured in metres. Missing/zero heights stay absent.
        filter: [">", ["to-number", ["get", "hauteur"], 0], 0],
        paint: {
          "fill-extrusion-color": c.building,
          "fill-extrusion-height": relief
            ? ["to-number", ["get", "hauteur"], 0]
            : 0,
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 1,
          "fill-extrusion-vertical-gradient": true,
        },
      },
      {
        id: BUILDING_BEFORE_LAYER_ID,
        type: "symbol",
        source,
        "source-layer": "toponyme_routier_odonyme_lin",
        minzoom: 15,
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 260,
          "text-field": ["coalesce", ["get", "nom_gauche"], ""],
          "text-font": regular,
          "text-size": ["interpolate", ["linear"], ["zoom"], 15, 11, 18, 13],
          "text-max-angle": 30,
          "text-keep-upright": true,
          "text-padding": 3,
          "text-allow-overlap": false,
          "text-pitch-alignment": "viewport",
        },
        paint: {
          "text-color": c.ink,
          "text-halo-color": c.road,
          "text-halo-width": 1.5,
        },
      },
      {
        id: "carnival-water-labels",
        type: "symbol",
        source,
        "source-layer": "toponyme_hydro_ponc",
        minzoom: 11,
        layout: {
          "text-field": ["coalesce", ["get", "texte"], ""],
          "text-font": regular,
          "text-size": 13,
          "text-max-width": 9,
          "text-padding": 16,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": c.waterInk,
          "text-halo-color": c.water,
          "text-halo-width": 1.5,
        },
      },
      {
        id: "carnival-town-labels",
        type: "symbol",
        source,
        "source-layer": "toponyme_localite_ponc",
        minzoom: 8,
        filter: ["in", "symbo", "COMMUNE_CHEF_LIEU", "COMMUNE_FUSIONNEE"],
        layout: {
          "text-field": ["coalesce", ["get", "texte"], ""],
          "text-font": bold,
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 12, 16, 19],
          "text-max-width": 10,
          "text-padding": 24,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": c.ink,
          "text-halo-color": c.land,
          "text-halo-width": 2,
        },
      },
    ],
  }
}
