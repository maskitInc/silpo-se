#!/usr/bin/env node
/** Smoke: prevMonthKey / addMonthsKey for shorts ?month=prev */
import { addMonthsKey, currentMonthKey, prevMonthKey } from "../../js/spend.js";

const sep = new Date(Date.UTC(2026, 8, 5)); // Sep 5 2026
const cur = currentMonthKey(sep);
const prev = prevMonthKey(sep);
if (cur !== "2026-09") throw new Error(`cur=${cur}`);
if (prev !== "2026-08") throw new Error(`prev=${prev}`);
if (addMonthsKey("2026-01", -1) !== "2025-12") throw new Error("jan wrap");
if (addMonthsKey("2025-12", 1) !== "2026-01") throw new Error("dec wrap");
console.log("OK month-key smoke", { cur, prev });
