# Route Optimizer and Fleet

Aurora Transport now keeps route proposals separate from the live dispatch plan. An administrator can optimize a day, inspect the proposed driver allocation and distance, and then approve it atomically with `approve_route_plan`.

## Routing engine

The Edge Function `optimize-routes` always has a built-in deterministic fallback. To use VROOM, configure these server-side secrets:

- `VROOM_BASE_URL`: URL to a compatible VROOM HTTP API.
- `VROOM_API_TOKEN`: optional bearer token for that API.

If VROOM fails, the UI clearly labels the Aurora fallback. Jobs that cannot satisfy driver skills or capacity stay unassigned.

## Fleet positions

The driver app continues to update the live position every 15 seconds and writes one history point per minute while an assignment is active. The company setting `fleet_location_retention_days` controls retention; call `prune_fleet_location_history()` from a server-side scheduled job.

For a Traccar-compatible provider:

1. Set `external_tracking_device_id` on the matching vehicle.
2. Configure `FLEET_WEBHOOK_SECRET` as a server-side secret.
3. Send JSON positions to `fleet-provider-webhook` with the same value in `x-fleet-webhook-secret`.

Provider credentials are never stored in `fleet_provider_connections`. The table only contains non-secret status metadata.
