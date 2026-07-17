import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { getClientIp, checkLimit } from "../../lib/limiter";

export const useStatus = routeLoader$((event) => {
  const ip = getClientIp(event);
  const result = checkLimit(ip, false); // false means do not consume/increment
  return {
    limit: result.limit,
    remaining: result.remaining,
  };
});

export default component$(() => {
  const status = useStatus();
  return (
    <div>
      <h1>Status</h1>
      <p>Limit: {status.value.limit}</p>
      <p>Remaining: {status.value.remaining}</p>
    </div>
  );
});
