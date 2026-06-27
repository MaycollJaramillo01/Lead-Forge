import { audit } from "./audit";
import { discover } from "./discover";
import { enrich } from "./enrich";
import { normalizeDedupe } from "./normalizeDedupe";
import { score } from "./score";

/** All Inngest functions served at /api/inngest. */
export const functions = [discover, normalizeDedupe, audit, score, enrich];
