declare module 'draco3dgltf' {
  type DracoModule = Record<string, unknown>;

  export function createDecoderModule(options?: Record<string, unknown>): Promise<DracoModule>;
  export function createEncoderModule(options?: Record<string, unknown>): Promise<DracoModule>;
  const draco3d: {
    createDecoderModule: typeof createDecoderModule;
    createEncoderModule: typeof createEncoderModule;
  };
  export default draco3d;
}
