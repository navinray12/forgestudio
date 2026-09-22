# Authentication

Sign-in, registration, sessions, OTP verification, OAuth and API authentication.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [api-key-authentication.middleware.ts](api-key-authentication.middleware.ts) | Authentication: request processing before the final handler. File responsibility: api key authentication middleware. |
| [auth.controller.ts](auth.controller.ts) | Authentication: HTTP handlers that translate requests into module operations and responses. File responsibility: auth controller. |
| [auth.repository.ts](auth.repository.ts) | Authentication: database reads and writes. File responsibility: auth repository. |
| [auth.routes.ts](auth.routes.ts) | Authentication: HTTP route registration and middleware order. File responsibility: auth routes. |
| [auth.service.ts](auth.service.ts) | Authentication: business operations and coordination with persistence or external services. File responsibility: auth service. |
| [auth.types.ts](auth.types.ts) | Authentication: shared TypeScript contracts. File responsibility: auth types. |
| [auth.validator.ts](auth.validator.ts) | Authentication: request input validation. File responsibility: auth validator. |
| [login.controller.ts](login.controller.ts) | Authentication: HTTP handlers that translate requests into module operations and responses. File responsibility: login controller. |
| [login.repository.ts](login.repository.ts) | Authentication: database reads and writes. File responsibility: login repository. |
| [login.routes.ts](login.routes.ts) | Authentication: HTTP route registration and middleware order. File responsibility: login routes. |
| [login.service.ts](login.service.ts) | Authentication: business operations and coordination with persistence or external services. File responsibility: login service. |
| [login.types.ts](login.types.ts) | Authentication: shared TypeScript contracts. File responsibility: login types. |
| [login.validator.ts](login.validator.ts) | Authentication: request input validation. File responsibility: login validator. |
| [me.routes.ts](me.routes.ts) | Authentication: HTTP route registration and middleware order. File responsibility: me routes. |
| [oauth.controller.ts](oauth.controller.ts) | Authentication: HTTP handlers that translate requests into module operations and responses. File responsibility: oauth controller. |
| [oauth.routes.ts](oauth.routes.ts) | Authentication: HTTP route registration and middleware order. File responsibility: oauth routes. |
| [oauth.service.ts](oauth.service.ts) | Authentication: business operations and coordination with persistence or external services. File responsibility: oauth service. |
| [otp.service.ts](otp.service.ts) | Authentication: business operations and coordination with persistence or external services. File responsibility: otp service. |
| [password.ts](password.ts) | Authentication: module implementation. File responsibility: password. |
| [public-api-authentication.middleware.ts](public-api-authentication.middleware.ts) | Authentication: request processing before the final handler. File responsibility: public api authentication middleware. |
| [session-authentication.middleware.ts](session-authentication.middleware.ts) | Authentication: request processing before the final handler. File responsibility: session authentication middleware. |
| [session.repository.ts](session.repository.ts) | Authentication: database reads and writes. File responsibility: session repository. |
| [session.service.ts](session.service.ts) | Authentication: business operations and coordination with persistence or external services. File responsibility: session service. |
| [session.ts](session.ts) | Authentication: module implementation. File responsibility: session. |
| [signup.controller.ts](signup.controller.ts) | Authentication: HTTP handlers that translate requests into module operations and responses. File responsibility: signup controller. |
| [signup.repository.ts](signup.repository.ts) | Authentication: database reads and writes. File responsibility: signup repository. |
| [signup.routes.ts](signup.routes.ts) | Authentication: HTTP route registration and middleware order. File responsibility: signup routes. |
| [signup.service.ts](signup.service.ts) | Authentication: business operations and coordination with persistence or external services. File responsibility: signup service. |
| [signup.validator.ts](signup.validator.ts) | Authentication: request input validation. File responsibility: signup validator. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
