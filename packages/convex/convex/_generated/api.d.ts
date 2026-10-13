/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as administration from "../administration.js";
import type * as authSessions from "../authSessions.js";
import type * as catalog from "../catalog.js";
import type * as groups from "../groups.js";
import type * as lib_live from "../lib/live.js";
import type * as lib_security from "../lib/security.js";
import type * as localFixtures from "../localFixtures.js";
import type * as observations from "../observations.js";
import type * as positions from "../positions.js";
import type * as sendNotifications from "../sendNotifications.js";
import type * as sessions from "../sessions.js";
import type * as telemetry from "../telemetry.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  administration: typeof administration;
  authSessions: typeof authSessions;
  catalog: typeof catalog;
  groups: typeof groups;
  "lib/live": typeof lib_live;
  "lib/security": typeof lib_security;
  localFixtures: typeof localFixtures;
  observations: typeof observations;
  positions: typeof positions;
  sendNotifications: typeof sendNotifications;
  sessions: typeof sessions;
  telemetry: typeof telemetry;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
