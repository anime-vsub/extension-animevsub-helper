/* eslint-disable no-undef */
/// <reference lib="dom" />

// Main world patches - injected via manifest world: "MAIN" to bypass CSP
// This script runs directly in the page's main world context

import { patchBtoa } from "../logic/patchBtoa"
import { patchWorker } from "../logic/patchWorker"

// Patch window.btoa to support UTF-8 characters without InvalidCharacterError
patchBtoa()

// Patch window.Worker to intercept download workers for HLS parsing and stream headers
patchWorker()
