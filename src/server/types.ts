import { IncomingMessage } from 'http';

// Универсальный request тип. При необходимости расширить.
//
// # Express 4 и 5 – подходит IncommingMessage.
// https://expressjs.com/en/5x/api.html#req
// > The req object is an enhanced version of Node’s own request object and supports all built-in fields and methods.
//
// # Hapi – подходит IncommingMessage.
// https://hapi.dev/api/?v=21.3.12#request.raw
// > An object containing the Node HTTP server objects.
//
// # Koa – подходит IncommingMessage.
// https://koajs.com/#request
// > A Koa Request object is an abstraction on top of node's vanilla request object,
// > providing additional functionality that is useful for every day HTTP server development.
//
// * Next.js 15 - подходит Request.
// https://nextjs.org/docs/app/api-reference/functions/next-request
// > NextRequest extends the Web Request API with additional convenience methods.
export type UniversalRequest = IncomingMessage | Request;
