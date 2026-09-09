// `server-only` is supplied by Next at build time and marks a module as
// unimportable from a Client Component. It has no runtime behaviour, and
// it doesn't resolve outside a Next build — so unit tests alias it here
// rather than dropping the guard from the modules that need it.
export {};
