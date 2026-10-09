# Platform

**Status:** decided items as of 2026-10-08. Proposals still under review are in the [game architecture plan](../plans/architecture/game-architecture/README.md).

## Delivery

- **Web**, built with Three.js + Svelte ([`stack.md`](stack.md)).
- **Installable web app (PWA), playable offline.** The player can download the whole game at once and play with no connection.
- **Hosting:** Vercel, probably.
- **Browsers:** current Chrome, Edge, Safari and Firefox on desktop. WebGPU where available, WebGL2 otherwise.

> **[Agent note]** Conflict to resolve (2026-10-09): in prototype 01 with the full ship, the owner measured Chrome at a solid 60 fps but **Firefox at 1080p a bit under 30 fps**. The owner's call: drop Firefox unless there's an easy fix, to be looked into later; testing on Chrome meanwhile. This line stands until that's decided.
- **Out of scope:** phones, tablets, Chromebooks, Steam Deck.

## Input

Gamepad first; keyboard and mouse supported as secondary ([`scope.md`](scope.md)).

## Test machines and performance targets

| Machine | GPU | Screen | Target |
|---|---|---|---|
| Owner's PC (AMD Ryzen 7 3800X) | NVIDIA GTX 1070 | 1920×1080 | 60 fps |
| MacBook Pro 13" 2020 (four-port), macOS 26 Tahoe | Intel Iris Plus G7 (integrated) | 2560×1600 | 30 fps |

The MacBook is the low end. No Steam Deck target: none available for testing.

## Saving

The player can stop and continue later. Progress is saved at checkpoints; individual props (books, cups…) aren't tracked and go back to their places on reload ([`scope.md`](scope.md)).
