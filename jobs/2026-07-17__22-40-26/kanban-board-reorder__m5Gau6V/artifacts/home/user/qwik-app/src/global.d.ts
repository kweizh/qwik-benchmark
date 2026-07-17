/// <reference types="vite/client" />
/// <reference types="@builder.io/qwik" />
/// <reference types="@builder.io/qwik-city" />

declare module "@qwik-client-manifest" {
  const manifest: import("@builder.io/qwik/optimizer").QwikManifest;
  export { manifest };
}

declare module "@qwik-city-plan" {
  const plan: import("@builder.io/qwik-city").QwikCityPlan;
  export default plan;
}
