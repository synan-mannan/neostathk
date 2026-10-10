import { Router } from "express";

const router = Router();

// Placeholder for future hackathon routes (e.g. router.use('/items', itemsRouter);)

router.get("/health", (req, res) => {
  res.json({
    message: "working",
  });
});

export const apiRouter = router;
