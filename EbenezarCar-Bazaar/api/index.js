/**
 * Ebenezar Car Bazaar API Gateway Stub
 * Prevents Vercel build failures from missing legacy server files.
 */
export default function handler(req, res) {
  return res.status(200).json({
    name: "Ebenezar Car Bazaar API",
    status: "online",
    notice: "Public API endpoints are served by the Ebenezar DMS backend."
  });
}
