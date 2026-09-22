// Tests never inherit real provider credentials: a stray key in the environment
// would turn a unit test into a billed live call.
delete process.env.NEBIUS_API_KEY;
process.env.SQUAD_SCREEN_MODEL_MODE ??= 'stub';
process.env.SQUAD_SCREEN_MODEL_ID ??= 'stub-model';
