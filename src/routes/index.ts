import cors from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import Elysia, { env } from "elysia";

import { apiRoute } from "~/routes/api";

new Elysia()
	.onError(({ code, error, set, status }) => {
		switch (code) {
			case "NOT_FOUND":
				return "Not Found";
			case "PARSE":
				set.status = 422;
				return "Unprocessable Content";
			case "VALIDATION":
				set.status = 400;
				return JSON.parse(error.message);
			case "INVALID_FILE_TYPE":
				set.status = 400;
				return "Invalid File Type";
			case "INVALID_COOKIE_SIGNATURE":
				set.status = 400;
				return "Invalid Cookie Signature";
			default:
				console.error(`An unexpected error has occurred (${code}):`, error);
				return status(500, "Internal Server Error");
		}
	})
	.use(cors({ origin: env.CORS_ORIGIN?.split(",") ?? [] }))
	.use(
		openapi({
			path: "/docs",
			documentation: {
				info: {
					title: "RUMC",
					version: "0.0.0",
					description: "Documentation for RUMC's REST API",
				},
				components: {
					securitySchemes: {
						token: { type: "apiKey", name: "Authorization", in: "header" },
					},
				},
				security: [{ token: [] }],
			},
		}),
	)
	.use(apiRoute)
	.listen(env.PORT || 3000);

console.info("Started RUMC API");
