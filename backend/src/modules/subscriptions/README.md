# Subscriptions

Apply subscription and usage-limit rules.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [subscription.controller.ts](subscription.controller.ts) | Subscriptions: HTTP handlers that translate requests into module operations and responses. File responsibility: subscription controller. |
| [subscription.middleware.ts](subscription.middleware.ts) | Subscriptions: request processing before the final handler. File responsibility: subscription middleware. |
| [subscription.routes.ts](subscription.routes.ts) | Subscriptions: HTTP route registration and middleware order. File responsibility: subscription routes. |
| [subscription.service.ts](subscription.service.ts) | Subscriptions: business operations and coordination with persistence or external services. File responsibility: subscription service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
