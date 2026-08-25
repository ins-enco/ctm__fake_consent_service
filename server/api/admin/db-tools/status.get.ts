/**
 * Reports whether the DB patch tool is configured, without leaking the
 * credentials themselves. The UI uses this to show/hide the form.
 */
export default defineEventHandler((event) => {
  const { dbPatchTool } = useRuntimeConfig(event);
  return {
    configured: isDbPatchToolConfigured(dbPatchTool),
    host: dbPatchTool.host || null,
    database: dbPatchTool.database || null,
    // Presence only, never the values — this tells you which piece of config is
    // missing without printing credentials.
    present: {
      host: Boolean(dbPatchTool.host),
      database: Boolean(dbPatchTool.database),
      user: Boolean(dbPatchTool.user),
      password: Boolean(dbPatchTool.password),
      key: Boolean(dbPatchTool.key),
    },
  };
});
