// Única función de la app: atiende toda la API. Una sola función = un solo arranque
// en frío y un solo lugar donde mirar los logs.
import { atender } from "../../servidor/app.js";

export default (req, context) => atender(req, { ip: context.ip ?? "" });

export const config = { path: "/api/*" };
