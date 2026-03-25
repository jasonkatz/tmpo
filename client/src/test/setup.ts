import { TextEncoder, TextDecoder } from "util";

// Polyfill TextEncoder/TextDecoder for jsdom environment (must be before jest-dom import)
Object.assign(global, { TextEncoder, TextDecoder });

import "@testing-library/jest-dom";
